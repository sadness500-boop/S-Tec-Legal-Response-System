# Legal Response System (법률 대응 시스템) — 한 파일 index.html 빌드
# 사용법: python3 source/build.py [출력경로]   (저장소 최상위에서 실행)
# Designed & Developed by Rat Rae Choi
import base64, json, os, sys
S = os.path.dirname(os.path.abspath(__file__)) + '/'
V = S + 'vendor/'
def rd(p): return open(p, encoding='utf-8').read()
def scr(s): return s.replace('</script', '<\\/script')
def png(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
asset = json.loads(rd(V + 'assets-base.json'))
asset['icon'] = png(V + 'icon.png')     # 메인화면 좌측 상단 아이콘
asset['voc'] = png(V + 'voc.png')       # PPT·PDF 표지 로고 = 앱 아이콘
asset['stage'] = 'data:video/mp4;base64,' + base64.b64encode(open(V + 'stage-team.mp4', 'rb').read()).decode()        # 메인 화면 법률대응팀 3D 스테이지
asset['stagePoster'] = 'data:image/jpeg;base64,' + base64.b64encode(open(V + 'stage-team.jpg', 'rb').read()).decode()
html = rd(S + 'index.html')
for ph, val in [('<!--LIBS-->', rd(V + 'libs.html')), ('<!--QR-->', rd(V + 'qr.html')),
                ('/*ASSETS*/', 'const ASSET=' + json.dumps(asset, ensure_ascii=False) + ';'),
                ('/*HF*/', scr(rd(S + 'hf.js'))), ('/*SITES*/', scr(rd(S + 'sites.js'))), ('/*KB*/', scr(rd(S + 'kb.js'))),
                ('/*UI*/', scr(rd(S + 'ui.js') + '\n' + rd(S + 'intake.js'))), ('/*APP*/', scr(rd(S + 'app.js'))),
                ('/*WORKER*/', scr(rd(S + 'worker.js'))), ('<!--AUTHCSS-->', rd(V + 'auth-css.html')),
                ('/*SUPABASE*/', rd(V + 'supabase.js')), ('/*AUTH*/', rd(V + 'auth.js')), ('/*APPACCESS*/', scr(rd(S + 'app-access.js')))]:
    assert html.count(ph) == 1, ph
    html = html.replace(ph, val)
out = sys.argv[1] if len(sys.argv) > 1 else S + '../index.html'
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html); print(out, len(html) // 1024, 'KB')
