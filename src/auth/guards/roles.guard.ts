
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Ambil role yang dibutuhkan endpoint
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    // Jika endpoint tidak menentukan role, izinkan
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Ambil informasi user dari JWT Strategy
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    // Periksa apakah role user sesuai
    return user && requiredRoles.includes(user.role);
  }
}
