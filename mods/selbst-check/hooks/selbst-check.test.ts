import { expect, test } from 'claude-code/testing'
import { scanSecurity } from './scan.ts'

test('findet typische Sicherheitslücken', async () => {
  const rules = (path: string, code: string) => scanSecurity(path, code).map(f => f.rule)

  expect(rules('a.py', 'subprocess.run(cmd, shell=True)')).toContain('py-shell')
  expect(rules('a.py', 'data = pickle.loads(blob)')).toContain('py-pickle')
  expect(rules('a.js', 'el.innerHTML = userInput')).toContain('inner-html')
  expect(rules('a.ts', 'const password = "hunter2secret"')).toContain('secret-hardcoded')
  expect(rules('a.py', 'cur.execute(f"SELECT * FROM users WHERE id={uid}")')).toContain('sql-injection')
  expect(rules('a.py', 'requests.get(url, verify=False)')).toContain('tls-off')
})

test('lässt sauberen Code und markierte Zeilen in Ruhe', async () => {
  expect(scanSecurity('a.py', 'subprocess.run(["ls", "-l"])\nprint("hallo")')).toEqual([])
  expect(scanSecurity('a.py', 'subprocess.run(cmd, shell=True)  # selbst-check: ok')).toEqual([])
  expect(scanSecurity('README.md', 'Benutze niemals eval( im Code')).toEqual([])
})

test('meldet Funde nach einem Write direkt an Claude zurück', async ($, on) => {
  on('tool.call', { tool: 'Write' }, (_, e) => ({
    result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null },
  }))

  const bad = await $.tool.call({ tool: 'Write', file_path: '/tmp/x.py', content: 'import os\nos.system(cmd)\n' })
  expect(bad.context?.join('\n') ?? '').toContain('os.system')

  const good = await $.tool.call({ tool: 'Write', file_path: '/tmp/y.txt', content: 'nur Text\n' })
  expect(good.context ?? []).toEqual([])
})
