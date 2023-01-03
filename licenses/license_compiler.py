
import subprocess
import json
import os
import glob
from ast import literal_eval
import sys


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


cargo_path = os.path.expanduser(
    '~/.cargo/registry/src/github.com-1ecc6299db9ec823/')

license_names = ['LICENSE', 'LICENSE-MIT',
                 'LICENSE-APACHE', 'LICENSE.md', 'LICENSE-BSD-3-Clause']


def normalize_text(text):
    return ' '.join(text.split()).lower()


APACHE2 = 'Apache-2.0'
APACHE2LLVM = 'Apache-2.0-WITH-LLVM-exception'
BSD0 = '0BSD'
MIT = 'MIT'
BSD3 = 'BSD-3-Clause'
ZLIB = 'Zlib'
UNICODE = 'Unicode-DFS-2016'
ISC = 'ISC'

ALL_LICENSES = [APACHE2, BSD0, MIT, BSD3, ZLIB, UNICODE, ISC]

# TODO: use regexes?
MATCHES = {k: [normalize_text(x) for x in v] for (k, v) in {
    APACHE2LLVM: ['''LLVM Exceptions to the Apache 2.0 License'''],
    APACHE2: ['''
                                  Apache License
                        Version 2.0, January 2004
    ''', '''
    Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at'''],
    MIT: ['''
Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.
''', '''
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.
'''],
    BSD0: ['''
Permission to use, copy, modify, and/or distribute this software for
any purpose with or without fee is hereby granted.
'''],
    BSD3: ['''Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.
''', '''
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
'''],
    ZLIB: ['''
Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
'''],
    UNICODE: ['''Permission is hereby granted, free of charge, to any person obtaining
a copy of the Unicode data files and any associated documentation
(the "Data Files") or Unicode software and any associated documentation
(the "Software") to deal in the Data Files or Software
without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, and/or sell copies of
the Data Files or Software, and to permit persons to whom the Data Files
or Software are furnished to do so, provided that either
(a) this copyright and permission notice appear with all copies
of the Data Files or Software, or
(b) this copyright and permission notice appear in associated
Documentation.'''],
    ISC: ['''Permission to use, copy, modify, and/or distribute this software for any purpose with or without
fee is hereby granted, provided that the above copyright notice and this permission notice appear
in all copies.''']
}.items()}

AND = 'AND'
OR = 'OR'
LIC = 'LIC'


class LicenseCondition:
    def __init__(self, typ, conditions):
        self.typ = typ
        self.conditions = conditions

    def __str__(self) -> str:
        if self.typ == LIC:
            return self.conditions
        else:
            return '(' + f' {self.typ} '.join(str(c) for c in self.conditions) + ')'

    @staticmethod
    def parse_rec(expr):
        if isinstance(expr, str):
            return LicenseCondition(LIC, expr)
        if AND in expr and OR in expr:
            raise RuntimeError(f"failed to parse {expr}")
        typ = AND if AND in expr else OR if OR in expr else ''
        if not typ:
            raise RuntimeError(f"failed to parse {expr}")
        conditions = [c for c in expr if c != typ]
        if typ == OR:
            conditions.sort(key=lambda x: ALL_LICENSES.index(x)
                            if x in ALL_LICENSES else 10000)
        return LicenseCondition(typ, [LicenseCondition.parse_rec(c) for c in conditions])

    @staticmethod
    def parse(expr):
        def quote(x):
            return f',"{x}",' if x in (AND, OR) else \
                f'"{x}"' if x not in '()' else\
                x
        expr = (f'({expr})'
                .replace(' WITH ', '-WITH-')
                .replace(')', ' ) ')
                .replace('(', ' ( '))
        expr = ''.join([quote(x) for x in expr.split()])
        if expr[0] != '(':
            expr = '"' + expr
        if expr[-1] != ')':
            expr += '"'
        expr = literal_eval(expr)
        return LicenseCondition.parse_rec(expr)

    def satisfy(self, lics):
        if self.typ == LIC:
            return {self.conditions} if self.conditions in lics else {}
        elif self.typ == AND:
            s = set()
            for c in self.conditions:
                s.update(c.satisfy(lics))
            return s
        elif self.typ == OR:
            for c in self.conditions:
                s = c.satisfy(lics)
                if s:
                    return s
            return set()
        raise RuntimeError('unreachable')


def license_heuristic(file_name, text):
    t = normalize_text(text)
    lics = set()
    for (lic, cc) in MATCHES.items():
        for c in cc:
            if c in t:
                lics.add(lic)
    if lics == {APACHE2, APACHE2LLVM}:
        return [APACHE2LLVM]
    if not lics:
        eprint(f'\n\nWARN UNKNOWN {file_name}\n{text}\n\n')
    if len(lics) > 1:
        eprint(f'\n\nWARN INDETERMINATE {file_name}\n{text}\n\n')
    return list(lics)


def multi_glob_read(globs):
    out = []
    for g in globs:
        for fn in glob.glob(g):
            if not os.path.isfile(fn):
                continue
            with open(fn) as f:
                text = f.read()
                out.append((fn, text))
    return out


def strip_file_name(path):
    return path.rsplit('/', 1)[1]


class Package:
    def __init__(self, name, license, files, include):
        self.include = include
        self.name = name
        self.license = license
        license_set = {f[0] for f in files}
        use = license.satisfy(license_set)
        self.use = ', '.join(sorted(use))
        if not use:
            eprint(f'\n\nWARN UNSAT {name} {license}\n{files}\n\n')
        for l in use:
            found = []
            for (n, f, t) in files:
                if n == l:
                    found.append((n, f, t))
            if len(found) == 0:
                eprint(f'\n\nWARN NOTFOUND {name} {license} {l}\n{found}\n')
                continue
            if len(found) > 1:
                eprint(f'\n\nWARN MULTIPLE {name} {license} {l}\n{found}\n')
            self.include.append(found[0])

    def __str__(self) -> str:
        files = '\n\n'.join(f'{l} ({f}):\n```\n{t}\n```' for (
            f, l, t) in self.include)
        return f'### {self.name} {self.license}\n{files}'


def rust(path, ignore=[]):
    json_data = subprocess.check_output('cargo license -j'.split(), cwd=path)
    data = json.loads(json_data)
    packages = []
    for package in data:
        name = package['name']
        version = package['version']
        license = package['license']
        namever = f"{name}-{version}"
        if namever in ignore or name in ignore:
            continue
        cond = LicenseCondition.parse(license)
        base = f'{cargo_path}{namever}/'
        license_files = []
        include = []
        for f, t in multi_glob_read([f'{base}/LICENSE*', f'{base}/license*', f'{base}/COPYING*', f'{base}/LICENSES/*']):
            fn = strip_file_name(f).lower()
            if 'third-party' in fn or fn == 'license-mit-atty':
                include.append(('THIRD-PARTY', f, t))
            else:
                h = license_heuristic(f, t)
                if len(h) == 1:
                    license_files.append((h[0], f, t))
        for f, t in multi_glob_read([f'{base}/NOTICE*', f'{base}/notice*']):
            include.append(('NOTICE', f, t))

        pack = Package(namever, cond, license_files, include)
        packages.append(pack)

    return packages


def node(path, ignore=[]):
    packages = []
    json_data = subprocess.check_output(
        ['npx', 'license-checker', '--production', '--json'], cwd=path)
    data = json.loads(json_data)
    for name, props in data.items():
        if name in ignore:
            continue
        license = props['licenses']
        if license == 'UNLICENSED':
            eprint(f"\n\nWARN UNLICENSED {name}\n{props}\n")
            continue
        file_name = props['licenseFile']
        with open(file_name) as f:
            text = f.read()
        cond = LicenseCondition.parse(license)
        pack = Package(name=name, license=cond, files=[
                       (license, strip_file_name(file_name), text)], include=[])
        packages.append(pack)
    return packages


def read_file(fn):
    with open(fn) as f:
        return f.read()


def print_package(name, license):
    print(f'''### {name}
```
{license}
```

''')


def main():
    print('## NPM packages')
    for p in node('../webapp', ignore=['pdfextend@0.0.0']):
        print(p)
    print('## Cargo packages ')
    print_package('pdfium-render (Apache-2.0)', read_file('LICENSE_APACHE'))
    rust('../pdfextend-web', ignore={'pdfextend-lib', 'pdfium-render'
         'pdfextend-web', 'iter_tools-0.1.4'})


if __name__ == '__main__':
    main()
