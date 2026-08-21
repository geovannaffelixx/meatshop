/**
 * AuthService acts as a thin facade.
 * All business logic is delegated to dedicated Use Cases
 * following the Single Responsibility Principle (SOLID).
 *
 * Add here only cross-cutting concerns that don't belong
 * to a single use case (e.g.: session cleanup on user deletion).
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {}