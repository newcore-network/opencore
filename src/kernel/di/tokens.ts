/**
 * Dependency Injection Tokens for OpenCore.
 *
 * Using string tokens instead of class references for injection
 * avoids issues with circular dependencies and "TypeInfo not known"
 * errors in certain build environments.
 */
export const DI_TOKENS = {
  // Ports
  CommandExecutionPort: Symbol.for('CommandExecutionPort'),
  PlayerDirectoryPort: Symbol.for('PlayerDirectoryPort'),
  PrincipalPort: Symbol.for('PrincipalPort'),

  // Decorator Processors
  DecoratorProcessor: 'DecoratorProcessor',

  // Services
  DatabaseService: Symbol.for('DatabaseService'),
  HttpService: Symbol.for('HttpService'),
  ChatService: Symbol.for('ChatService'),

  // Providers
  PrincipalProvider: Symbol.for('PrincipalProvider'),
  AuthProvider: Symbol.for('AuthProvider'),

  // Adapters
  Exports: Symbol.for('IExports'),
  EngineEvents: Symbol.for('IEngineEvents'),
  NetTransport: Symbol.for('INetTransport'),
  Tick: Symbol.for('ITick'),
} as const
