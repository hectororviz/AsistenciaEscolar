import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as http from 'http';

export interface DahuaUser {
  recNo: string;
  userId: string;
  cardName: string;
  cardNo: string;
  cardStatus: string;
  cardType: string;
  citizenIdNo: string;
  password: string;
  userType: string;
  isValid: string;
  firstEnter: string;
  handicap: string;
  doors: string[];
  timeSections: string[];
  useTime: string;
  validDateStart: string;
  validDateEnd: string;
  vtoPosition: string;
  [key: string]: unknown;
}

@Injectable()
export class DahuaService {
  private readonly logger = new Logger(DahuaService.name);
  private readonly host: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.getOrThrow<string>('DAHUA_HOST');
    this.username = this.config.getOrThrow<string>('DAHUA_USER');
    this.password = this.config.getOrThrow<string>('DAHUA_PASSWORD');
  }

  async getUsers(): Promise<DahuaUser[]> {
    const path = '/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&condition=';
    const raw = await this.digestRequest('GET', path);
    return this.parseUserResponse(raw);
  }

  private digestRequest(method: string, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const doRequest = (authHeader?: string) => {
        const opts: http.RequestOptions = {
          hostname: this.host,
          port: 80,
          path,
          method,
          headers: {} as Record<string, string>,
          timeout: 15000,
        };

        if (authHeader) {
          opts.headers!['Authorization'] = authHeader;
        }

        const req = http.request(opts, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');

            if (res.statusCode === 200) {
              resolve(body);
            } else if (res.statusCode === 401 && !authHeader) {
              const wwwAuth = res.headers['www-authenticate'];
              if (wwwAuth) {
                const auth = this.buildDigestAuth(method, path, wwwAuth);
                doRequest(auth);
              } else {
                reject(new Error('401 without WWW-Authenticate header'));
              }
            } else {
              reject(
                new Error(
                  `Dahua API error: HTTP ${res.statusCode} ${res.statusMessage} - ${body.slice(0, 500)}`,
                ),
              );
            }
          });
        });

        req.on('error', (err) => {
          reject(new Error(`Dahua API connection failed: ${err.message}`));
        });
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Dahua API request timeout'));
        });

        req.end();
      };

      doRequest();
    });
  }

  private buildDigestAuth(
    method: string,
    uri: string,
    wwwAuth: string,
  ): string {
    const realm = this.extractValue(wwwAuth, 'realm');
    const nonce = this.extractValue(wwwAuth, 'nonce');
    const qop = this.extractValue(wwwAuth, 'qop') || 'auth';
    const opaque = this.extractValue(wwwAuth, 'opaque');
    const algorithm = this.extractValue(wwwAuth, 'algorithm') || 'MD5';

    const cnonce = crypto.randomBytes(16).toString('hex');
    const nc = '00000001';

    const ha1 = this.md5(`${this.username}:${realm}:${this.password}`);
    const ha2 = this.md5(`${method}:${uri}`);
    const response = this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    let auth = `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", cnonce="${cnonce}", nc=${nc}, qop=${qop}, response="${response}"`;

    if (opaque) {
      auth += `, opaque="${opaque}"`;
    }
    if (algorithm) {
      auth += `, algorithm=${algorithm}`;
    }

    return auth;
  }

  private extractValue(header: string, key: string): string {
    const regex = new RegExp(`${key}="?([^",]+)"?`, 'i');
    const match = header.match(regex);
    return match ? match[1] : '';
  }

  private md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private parseUserResponse(raw: string): DahuaUser[] {
    const lines = raw.split(/[\r\n]+/).filter((l) => l.trim());
    const recordsMap: Record<number, Record<string, string>> = {};
    const doors: Record<number, string[]> = {};
    const timeSections: Record<number, string[]> = {};

    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;

      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1);

      if (key === 'found') continue;

      const recMatch = key.match(/^records\[(\d+)\]\.(.+)$/);
      if (!recMatch) continue;

      const idx = parseInt(recMatch[1], 10);
      const field = recMatch[2];

      const doorMatch = field.match(/^Doors\[(\d+)\]$/);
      if (doorMatch) {
        if (!doors[idx]) doors[idx] = [];
        doors[idx][parseInt(doorMatch[1], 10)] = value;
        continue;
      }

      const tsMatch = field.match(/^TimeSections\[(\d+)\]$/);
      if (tsMatch) {
        if (!timeSections[idx]) timeSections[idx] = [];
        timeSections[idx][parseInt(tsMatch[1], 10)] = value;
        continue;
      }

      if (!recordsMap[idx]) recordsMap[idx] = {};
      recordsMap[idx][field] = value;
    }

    const result: DahuaUser[] = [];
    for (let i = 0; i < Object.keys(recordsMap).length; i++) {
      if (recordsMap[i]) {
        const u = recordsMap[i];
        result.push({
          recNo: u.RecNo || '',
          userId: u.UserID || '',
          cardName: u.CardName || '',
          cardNo: u.CardNo || '',
          cardStatus: u.CardStatus || '',
          cardType: u.CardType || '',
          citizenIdNo: u.CitizenIDNo || '',
          password: u.Password || '',
          userType: u.UserType || '',
          isValid: u.IsValid || '',
          firstEnter: u.FirstEnter || '',
          handicap: u.Handicap || '',
          doors: doors[i] || [],
          timeSections: timeSections[i] || [],
          useTime: u.UseTime || '',
          validDateStart: u.ValidDateStart || '',
          validDateEnd: u.ValidDateEnd || '',
          vtoPosition: u.VTOPosition || '',
          raw: u,
        });
      }
    }

    this.logger.log(`Parsed ${result.length} cards from Dahua response`);

    return result;
  }
}
