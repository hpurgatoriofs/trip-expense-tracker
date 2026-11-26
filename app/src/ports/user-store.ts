// Port for user persistence (F1). Interface only. Implemented in src/db/.

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type CreateUserResult = { ok: true } | { ok: false; reason: "email_taken" };

export interface UserStore {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(record: UserRecord): Promise<CreateUserResult>;
}
