// Port for password hashing (F1). Interface only. Implemented with argon2id in src/db/ or src/auth/.

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /** A valid hash of a random value, verified against when no user matches, so login timing does not reveal which emails exist. */
  dummyHash: string;
}
