"""Run against the locally served project: python3 tests/browser.py."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

base = 'http://127.0.0.1:8000'
root = Path(__file__).resolve().parents[1]
questions = json.loads((root / 'questions.js').read_text().split(' = ', 1)[1].rstrip(';\n'))


def check_copy(page, expected, fallback=False):
    page.evaluate('(reject) => { window.rejectClipboard = reject; window.copiedResult = null; }', fallback)
    page.get_by_role('button', name='Скопировать результат для преподавателя').click()
    page.wait_for_function('window.copiedResult !== null')
    assert page.evaluate('window.copiedResult') == expected
    assert page.locator('#copy-status').inner_text() == 'Результат скопирован'


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width, height in [(390, 844), (320, 740), (1440, 1000)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        # Capture the clipboard payload without depending on OS clipboard permissions.
        context.add_init_script("""
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
                writeText: async (text) => {
                    if (window.rejectClipboard) throw new Error('Clipboard unavailable');
                    window.copiedResult = text;
                }
            }});
            document.execCommand = (command) => {
                if (command !== 'copy') throw new Error('Unexpected command');
                window.copiedResult = document.querySelector('textarea').value;
                return true;
            };
        """)
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
        assert page.locator('.mistake-card').count() == 0
        assert page.locator('#mistakes-title').inner_text() == 'Ошибок нет'
        check_copy(page, 'Ориентировочный уровень грамматики: B2\n\nБаза: 10 / 10\nA2 grammar: 15 / 15\nB1 grammar: 15 / 15\nB2 grammar: 10 / 10\n\nОшибок нет.')
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
        assert page.locator('.mistake-card').count() == 50
        # Only the revised questions are wrong: verify block scoring, review and export.
        page.get_by_role('button', name='Пройти тест ещё раз').click()
        wrong_choices = {6: 3, 28: 0, 45: 0}
        for i, question in enumerate(questions):
            choice = wrong_choices.get(i + 1, question['answer'])
            page.locator('.option').nth(choice).click()
            page.get_by_role('button', name='Узнать результат' if i == 49 else 'Далее').click()
        assert page.locator('h1').inner_text() == 'B2'
        assert [s.inner_text() for s in page.locator('.score-row strong').all()] == ['9 / 10','15 / 15','14 / 15','9 / 10']
        cards = page.locator('.mistake-card')
        assert cards.count() == 3
        expected_summary = ['Ориентировочный уровень грамматики: B2', '', 'База: 9 / 10', 'A2 grammar: 15 / 15', 'B1 grammar: 14 / 15', 'B2 grammar: 9 / 10', '', 'Ошибки (3):']
        for card, (number, wrong, correct) in zip(cards.all(), [(6, 'Is', 'Do'), (28, 'studied', 'has been studying'), (45, 'must have', "can't have")]):
            sentence = questions[number - 1]['sentence']
            # Compare source text: CSS renders this label in uppercase.
            assert card.locator('.mistake-number').text_content() == f'Вопрос {number}'
            assert card.locator('.mistake-sentence').inner_text() == sentence
            assert card.locator('.wrong-answer').inner_text() == wrong
            assert card.locator('.correct-answer').inner_text() == correct
            expected_summary.extend([f'Вопрос {number}: {sentence}', f'Ответ ученицы: {wrong}', f'Правильный ответ: {correct}', ''])
        summary = '\n'.join(expected_summary).strip()
        check_copy(page, summary)
        check_copy(page, summary, fallback=True)
        assert page.locator('textarea').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert context.cookies() == []
        assert page.evaluate('localStorage.length + sessionStorage.length') == 0
        assert all(url.startswith(base + '/') for url in requests), requests
        assert not errors, errors
        print(f'PASS {width}px: keyboard, back, 150 answers, results, reset, revised mistakes, clipboard and fallback, no external requests or storage')
        context.close()
    browser.close()
