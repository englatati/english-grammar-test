"""Run against the locally served project: python3 tests/browser.py."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

base = 'http://127.0.0.1:8000'
root = Path(__file__).resolve().parents[1]
questions = json.loads((root / 'questions.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width, height in [(390, 844), (320, 740), (1440, 1000)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        response = page.goto(base)
        assert response.status == 200
        assert page.locator('h1').inner_text().replace('\n', ' ') == 'Проверьте свою грамматику английского'
        page.get_by_role('button', name='Начать тест').click()
        assert page.get_by_role('button', name='Далее').is_disabled()
        # Keyboard selects the first radio, and keeps visible focus.
        page.keyboard.press('Tab')
        page.keyboard.press('Space')
        assert page.locator('input:checked').count() == 1
        page.get_by_role('button', name='Далее').click()
        page.get_by_role('button', name='Назад').click()
        assert page.locator('input:checked').count() == 1
        page.locator('.option').nth(2).click()
        page.get_by_role('button', name='Далее').click()
        page.get_by_role('button', name='Назад').click()
        assert page.locator('input:checked').get_attribute('value') == '2'
        for i, question in enumerate(questions):
            assert page.locator('h1').inner_text().replace('\n', '') == question['sentence']
            assert page.locator('input[type=radio]').count() == 4
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('.option').nth(question['answer']).click()
            page.get_by_role('button', name='Узнать результат' if i == 49 else 'Далее').click()
        assert page.locator('h1').inner_text() == 'B2'
        assert [s.inner_text() for s in page.locator('.score-row strong').all()] == ['10 / 10','15 / 15','15 / 15','10 / 10']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if width == 390:
            page.screenshot(path='/tmp/grammar-result-mobile.png', full_page=True)
        page.get_by_role('button', name='Пройти тест ещё раз').click()
        assert page.locator('input:checked').count() == 0
        assert page.get_by_role('button', name='Далее').is_disabled()
        assert 'Вопрос 1 из 50' in page.locator('.progress-label').inner_text()
        # A second full run checks the low-result screen and reset of every answer.
        for i, question in enumerate(questions):
            assert page.locator('input:checked').count() == 0
            page.locator('.option').nth((question['answer'] + 1) % 4).click()
            page.get_by_role('button', name='Узнать результат' if i == 49 else 'Далее').click()
        assert page.locator('h1').inner_text() == 'Базовая грамматика пока требует внимания'
        assert [s.inner_text() for s in page.locator('.score-row strong').all()] == ['0 / 10','0 / 15','0 / 15','0 / 10']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert context.cookies() == []
        assert page.evaluate('localStorage.length + sessionStorage.length') == 0
        assert all(url.startswith(base + '/') for url in requests), requests
        assert not errors, errors
        print(f'PASS {width}px: keyboard, back, 100 answers, results, reset, no external requests or storage')
        context.close()
    browser.close()
