
import subprocess
import json
import os
import glob
from ast import literal_eval

cargo_path = os.path.expanduser(
    '~/.cargo/registry/src/github.com-1ecc6299db9ec823/')

license_names = ['LICENSE', 'LICENSE-MIT',
                 'LICENSE-APACHE', 'LICENSE.md', 'LICENSE-BSD-3-Clause']


def traverse_node_packages(dependencies, out):
    for (name, data) in dependencies.items():
        out.append(name + '-' + data['version'])
        deps = data.get('dependencies')
        if deps:
            traverse_node_packages(deps, out)


def node(path):
    json_data = subprocess.check_output(
        ['npm', 'ls', '-j', '--omit=dev', '--depth=Infinity'], cwd=path)
    data = json.loads(json_data)
    package_list = []
    traverse_node_packages(data['dependencies'], package_list)
    print('\n'.join(sorted(set(package_list))))


def normalize_text(text):
    return ' '.join(text.split()).lower()


APACHE2 = 'Apache-2.0'
BSD0 = '0BSD'
MIT = 'MIT'
BSD3 = 'BSD-3-Clause'
ZLIB = 'Zlib'
UNICODE = 'Unicode-DFS-2016'
ISC = 'ISC'

ALL_LICENSES = [APACHE2, BSD0, MIT, BSD3, ZLIB, UNICODE, ISC]

MATCHES = {k: [normalize_text(x) for x in v] for (k, v) in {
    APACHE2: ['://www.apache.org/licenses/LICENSE-2.0', '''
                                  Apache License
                        Version 2.0, January 2004
    '''],
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
''', 'MIT License'],
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
        expr = ''.join([quote(x) for x in f'({expr})'.replace(
            ')', ' ) ').replace('(', ' ( ').split()])
        print(expr)
        if expr[0] != '(':
            expr = '"' + expr
        if expr[-1] != ')':
            expr += '"'
        expr = literal_eval(expr)
        return LicenseCondition.parse_rec(expr)

    def satisfy(self, list, select):
        if self.typ == LIC:
            if self.conditions in list:
                return {self.conditions}
        elif self.typ == AND:
            select = {}


def license_heuristic(text):
    t = normalize_text(text)
    lics = set()
    for (lic, cc) in MATCHES.items():
        for c in cc:
            if c in t:
                lics.add(lic)
    if not lics:
        print('\n\nUNKNOWN')
        print(text)
        print('\n\n')
    return lics


def multi_glob_read(globs):
    out = {}
    for g in globs:
        for fn in glob.glob(g):
            if not os.path.isfile(fn):
                continue
            with open(fn) as f:
                text = f.read()
                n = fn.rsplit('/', 1)[1]
                out[n] = text
    return out


def rust(path):
    json_data = subprocess.check_output('cargo license -j'.split(), cwd=path)
    data = json.loads(json_data)
    for package in data:
        name = package['name']
        version = package['version']
        license = package['license']
        print(f"{name}-{version}: {license} | {LicenseCondition.parse(license)}")
        license_files = {}
        base = f'{cargo_path}{name}-{version}/'
        for n, t in multi_glob_read([f'{base}/LICENSE*', f'{base}/license*', f'{base}/COPYING*', f'{base}/LICENSES/*']).items():
            print(n, license_heuristic(t))
        notice = multi_glob_read([f'{base}/NOTICE*', f'{base}/notice*'])
        if notice:
            print('notice', notice)

        # ok = [l for l in license_names if os.path.exists(
        #     f'{cargo_path}{name}-{version}/{l}')]
        # print(ok)


def main():
    # node('../webapp')
    rust('../pdfextend-web')


if __name__ == '__main__':
    main()
