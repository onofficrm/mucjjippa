import { expect, test } from '@playwright/test';

async function openFreshLogin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: '묵찌빠 팡' })).toBeVisible({
    timeout: 30_000,
  });
  // 부트스트랩·401 처리가 끝난 뒤 네비게이션이 안정되도록 짧게 대기
  await page.waitForTimeout(500);
}

test.describe('주요 UI 시나리오', () => {
  test('로그인 페이지 렌더', async ({ page }) => {
    await openFreshLogin(page);
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('회원가입 → 자동 로그인 → 메인 진입', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const loginId = `pw_${suffix}`;
    const nickname = `PW${suffix.slice(-6)}`;
    const password = 'Test1234!';

    await openFreshLogin(page);
    await page.getByRole('button', { name: /계정이 없나요\? 회원가입/ }).click();
    await expect(page.getByRole('heading', { name: '새 계정 만들기' })).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[autocomplete="username"]').fill(loginId);
    await page.getByPlaceholder('2~16자').fill(nickname);
    await page.locator('input[autocomplete="new-password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: '회원가입 완료' }).click();

    // 가입 성공 후 로그인 폼이 사라지고 메인 네비가 보인다
    await expect(page.getByRole('button', { name: '회원가입 완료' })).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(page.getByText('게스트로 체험하기')).toHaveCount(0);
  });

  test('시드 계정 로그인 (dorirang)', async ({ page }) => {
    await openFreshLogin(page);
    await page.locator('input[autocomplete="username"]').fill('dorirang');
    await page.locator('input[autocomplete="current-password"]').fill('User1234!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();

    await expect(page.getByText('게스트로 체험하기')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toHaveCount(0);
  });
});
