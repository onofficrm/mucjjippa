import { z } from 'zod';

const loginIdSchema = z
  .string()
  .trim()
  .min(4, 'loginId는 4자 이상이어야 합니다')
  .max(32, 'loginId는 32자 이하여야 합니다')
  .regex(/^[a-zA-Z0-9_]+$/, 'loginId는 영문, 숫자, _ 만 사용할 수 있습니다');

const nicknameSchema = z
  .string()
  .trim()
  .min(2, '닉네임은 2자 이상이어야 합니다')
  .max(16, '닉네임은 16자 이하여야 합니다');

const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .max(72, '비밀번호는 72자 이하여야 합니다');

const emailSchema = z
  .string()
  .trim()
  .email('올바른 이메일 형식이 아닙니다')
  .max(255)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const signupBodySchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  email: emailSchema,
  agreeTerms: z.boolean().refine((v) => v === true, {
    message: '서비스 이용약관에 동의해야 합니다',
  }),
  agreePrivacy: z.boolean().refine((v) => v === true, {
    message: '개인정보 처리방침에 동의해야 합니다',
  }),
});

export const loginBodySchema = z.object({
  loginId: z.string().trim().min(1, 'loginId를 입력해 주세요'),
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
});

export const updateProfileBodySchema = z
  .object({
    nickname: nicknameSchema.optional(),
    avatarId: z.string().min(1).max(64).nullable().optional(),
    titleId: z.string().min(1).max(64).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 항목이 없습니다',
  });

export const updateSettingsBodySchema = z.object({
  language: z.string().min(2).max(8).optional(),
  bgmVolume: z.number().min(0).max(1).optional(),
  effectVolume: z.number().min(0).max(1).optional(),
  vibration: z.boolean().optional(),
  tournamentNotification: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  autoChoice: z.boolean().optional(),
  watchAutoNext: z.boolean().optional(),
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>;
