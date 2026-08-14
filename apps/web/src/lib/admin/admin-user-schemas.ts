import { z } from "zod";

export const adminUserIdSchema = z.uuid("관리자 계정 식별값을 확인해 주세요.");

export const adminInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .max(320, "이메일 주소가 너무 깁니다.")
    .pipe(z.email("올바른 이메일 주소를 입력해 주세요."))
    .transform((value) => value.toLowerCase())
});

export const adminPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "비밀번호는 12자 이상으로 설정해 주세요.")
      .max(128, "비밀번호는 128자 이하로 설정해 주세요."),
    password_confirmation: z.string()
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "비밀번호 확인이 일치하지 않습니다.",
    path: ["password_confirmation"]
  });

export const adminRoleSchema = z.enum(["owner", "editor"]);
