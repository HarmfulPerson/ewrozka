export type JwtPayloadType = {
  id: string;
  roles: string[];
  iat: number;
  exp: number;
};
