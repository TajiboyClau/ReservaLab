declare global {
  namespace Express {
    interface Request {
      auth?: { usuarioId: string; rol: string };
      apiKeyId?: string;
    }
  }
}

export {};
