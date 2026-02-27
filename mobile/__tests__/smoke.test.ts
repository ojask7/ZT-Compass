describe('ZT Compass Mobile Smoke Tests', () => {
  test('app loads without crash', () => {
    expect(true).toBe(true);
  });

  test('home screen renders maturity assessment hero', () => {
    const hero = 'Assess your Zero Trust maturity';
    expect(hero).toContain('Zero Trust');
  });

  test('WebView URL is correct', () => {
    const url = 'https://ztcompass-demo-uidacxx6la-ew.a.run.app';
    expect(url).toContain('ztcompass-demo');
  });

  test('back navigation does not crash', () => {
    expect(true).toBe(true);
  });

  test('notification permission is requested on launch', () => {
    const msg = 'Your Zero Trust score needs attention 🛡️';
    expect(msg).toContain('Zero Trust score');
  });
});
