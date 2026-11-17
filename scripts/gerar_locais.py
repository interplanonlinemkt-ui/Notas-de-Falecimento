#!/usr/bin/env python3
# Converte data/locais.csv (separado por ;) em js/locais.js
# Uso: python3 scripts/gerar_locais.py data/locais.csv js/locais.js
import csv, json, sys
rows = list(csv.DictReader(open(sys.argv[1] if len(sys.argv) > 1 else 'data/locais.csv', encoding='utf-8-sig'), delimiter=';'))
out = []
for r in rows:
    cat, nome, end = (r.get('Categoria') or '').strip(), (r.get('Nome') or '').strip(), (r.get('Endereço') or '').strip()
    if not nome: continue
    if cat == 'Unidade Interplan' and 'Escritório' in nome and 'Velório' not in nome:
        continue
    if nome.startswith('Funerária Interplan (Escritório e Casa de Velório)'):
        nome = 'Interplan - Casa de Velório Martinópolis'
        end = 'R. José Maria Sanches, 190 – Centro'
    tipo = 'cemiterio' if cat == 'Cemitério' else 'velorio'
    cidade = r['Cidade'].strip()
    if end.replace('–','-').replace(' ','').lower() == f"{cidade}-sp".replace(' ','').lower():
        end = ''
    o = {'cidade': cidade, 'uf': r['UF'].strip(), 'nome': nome, 'tipo': tipo,
         'endereco': end.replace(' – ', ' - '), 'cep': (r.get('CEP') or '').strip(), 'obs': (r.get('Observações / Horário') or '').strip()}
    if cat == 'Unidade Interplan': o['interplan'] = True
    out.append(o)
print(len(out))

js = '// Lista de velórios e cemitérios pré-cadastrados.\n// Gerada a partir de data/locais.csv com:  python3 scripts/gerar_locais.py\nwindow.LOCAIS = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';\n'
open(sys.argv[2] if len(sys.argv) > 2 else 'js/locais.js', 'w', encoding='utf-8').write(js)
