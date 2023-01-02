
import subprocess
import json
import os
import glob

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


Apache2 = 'Apache-2.0'
BSD0 = '0BSD'
MIT = 'MIT'
BSD3 = 'BSD-3-Clause'
ZLIB = 'Zlib'

MATCHES = {k: [normalize_text(x) for x in v] for (k, v) in {
    Apache2: ['https://www.apache.org/licenses/LICENSE-2.0', '''
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
''']
}.items()}


def license_heuristic(text):
    t = normalize_text(text)
    lics = set()
    for (lic, cc) in MATCHES.items():
        for c in cc:
            if c in t:
                lics.add(lic)
    if not lics:
        return lics
    print('\n\nUNKNOWN')
    print(text)
    exit(1)


def rust(path):
    json_data = subprocess.check_output('cargo license -j'.split(), cwd=path)
    data = json.loads(json_data)
    for package in data:
        name = package['name']
        version = package['version']
        license = package['license']
        print(f"{name}-{version}: {license}")
        license_files = {}
        base = f'{cargo_path}{name}-{version}/'
        for l in glob.glob(f'{base}/LICENSE*') + glob.glob(f'{base}/LICENSES/*'):
            if not os.path.isfile(l):
                continue
            with open(l) as f:
                text = f.read()
                print(l.rsplit('/', 1)[1])
                print(license_heuristic(text))
        # ok = [l for l in license_names if os.path.exists(
        #     f'{cargo_path}{name}-{version}/{l}')]
        # print(ok)


def main():
    # node('../webapp')
    rust('../pdfextend-web')


if __name__ == '__main__':
    main()
