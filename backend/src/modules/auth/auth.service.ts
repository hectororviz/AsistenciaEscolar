import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly users = [{ username: 'admin', password: '123456' }];

  constructor(private readonly jwtService: JwtService) {}

  validateUser(username: string, password: string) {
    const user = this.users.find(
      (u) => u.username === username && u.password === password,
    );
    return user ? { username: user.username, role: 'ADMIN' } : null;
  }

  login(user: { username: string; role: string }) {
    const payload = { username: user.username, sub: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { username: user.username, role: user.role },
    };
  }
}
