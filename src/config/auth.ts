export const authConfig = {
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret",
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400),
};
