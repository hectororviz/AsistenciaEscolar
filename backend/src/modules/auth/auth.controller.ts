import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    const user = this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña invalidos');
    }
    return this.authService.login(user);
  }
}
