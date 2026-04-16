import os, re
root='.'
paths=['src/app','src/components','src/lib']
skip_dirs={'node_modules','.next'}
exts={'.ts','.tsx','.js','.jsx','.mjs','.cjs'}
pat=re.compile(r'''(["'`])([^\n]*?[A-Za-z][^\n]*?)\1''')
ignore_substrings=['http://','https://','aria-','data-','className','use client','use server','@/','./','../','node:','next/','application/json','multipart/form-data']
for base in paths:
    for dirpath, dirnames, filenames in os.walk(os.path.join(root, base)):
        rel_dir=os.path.relpath(dirpath, root)
        if rel_dir.startswith('src/lib/i18n'):
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fn in filenames:
            if os.path.splitext(fn)[1] not in exts or '.test.' in fn:
                continue
            path=os.path.join(dirpath, fn)
            relpath=os.path.relpath(path, root)
            with open(path, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f, 1):
                    if 't(' in line or 'messages.' in line or 'getRequestI18n' in line:
                        continue
                    vals=[]
                    for m in pat.finditer(line):
                        s=m.group(2).strip()
                        if len(s) < 3:
                            continue
                        if any(sub in s for sub in ignore_substrings):
                            continue
                        if re.fullmatch(r'[A-Z0-9_./:-]+', s):
                            continue
                        vals.append(s)
                    if vals:
                        print(f'{relpath}:{i}: ' + ' | '.join(vals[:3]))
