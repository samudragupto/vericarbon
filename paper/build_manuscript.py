import os, re

def protect_math(text):
    math_blocks = []
    def repl(m):
        math_blocks.append(m.group(0))
        return f'XYZMATHBLOCKXYZ{len(math_blocks)-1}XYZEND'
    
    text = re.sub(r'(\\begin\{equation\}.*?\\end\{equation\}|\$\$.*?\$\$|(?<!\\)\$.*?(?<!\\)\$)', repl, text, flags=re.DOTALL)
    return text, math_blocks

def restore_math(text, math_blocks):
    for idx, b in enumerate(math_blocks):
        text = text.replace(f'XYZMATHBLOCKXYZ{idx}XYZEND', b)
    return text

def sanitize_latex_prose(text):
    out = []
    i = 0
    n = len(text)
    
    no_escape_cmds = ('\\cite{', '\\label{', '\\ref{', '\\input{', '\\includegraphics{', '\\url{', '\\href{', '\\begin{', '\\end{')
    
    while i < n:
        if text[i:i+2] == '\\$':
            out.append('\\$')
            i += 2
            continue
            
        matched_cmd = None
        for cmd in no_escape_cmds:
            if text[i:i+len(cmd)] == cmd:
                matched_cmd = cmd
                break
        if matched_cmd:
            out.append(matched_cmd)
            i += len(matched_cmd)
            brace_depth = 1
            while i < n and brace_depth > 0:
                if text[i] == '{':
                    brace_depth += 1
                elif text[i] == '}':
                    brace_depth -= 1
                out.append(text[i])
                i += 1
            continue
            
        if text[i] == '_':
            if i > 0 and text[i-1] == '\\':
                out.append('_')
            else:
                out.append('\\_')
            i += 1
            continue

        if text[i] == '&':
            if i > 0 and text[i-1] == '\\':
                out.append('&')
            else:
                out.append('\\&')
            i += 1
            continue
            
        out.append(text[i])
        i += 1
        
    return ''.join(out)

def convert_md_section(md_content):
    # Normalize line endings
    text = md_content.replace('\r\n', '\n')
    
    # Replace markdown table input with latex table input
    text = re.sub(r'\\input\{tables/([a-zA-Z0-9_]+)\.md\}', r'\\input{tables/\1.tex}', text)
    
    # Proof formatting BEFORE math protection
    text = text.replace(r'*Proof by Contradiction.*', r'\begin{proof}[Proof by Contradiction]')
    text = text.replace(r'*Proof.*', r'\begin{proof}')
    text = text.replace(r'$\blacksquare$', r'\end{proof}')

    # Protect math blocks completely before any markdown transformation
    text, math_blocks = protect_math(text)
    
    # Convert Headings
    text = re.sub(r'^# Section \d+:\s*(.*)$', r'\\section{\1}', text, flags=re.MULTILINE)
    text = re.sub(r'^# Appendices\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^# Appendix ([A-Z]):\s*(.*)$', r'\\section{\2}\n\\label{app:\1}', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.*)$', r'\\section{\1}', text, flags=re.MULTILINE)
    
    text = re.sub(r'^## \d+\.\d+\s*(.*)$', r'\\subsection{\1}', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.*)$', r'\\subsection{\1}', text, flags=re.MULTILINE)
    
    text = re.sub(r'^### \d+\.\d+\.\d+\s*(.*)$', r'\\subsubsection{\1}', text, flags=re.MULTILINE)
    text = re.sub(r'^### (.*)$', r'\\subsubsection{\1}', text, flags=re.MULTILINE)

    # Convert blockquotes
    lines = text.split('\n')
    out_lines = []
    in_quote = False
    for line in lines:
        if line.startswith('> '):
            clean = line[2:].strip()
            if not in_quote:
                out_lines.append(r'\begin{quote}')
                in_quote = True
            out_lines.append(clean)
        else:
            if in_quote:
                out_lines.append(r'\end{quote}')
                in_quote = False
            out_lines.append(line)
    if in_quote:
        out_lines.append(r'\end{quote}')
    text = '\n'.join(out_lines)

    # Format bold and italic on prose
    text = re.sub(r'\*\*(.+?)\*\*', r'\\textbf{\1}', text)
    text = re.sub(r'(?<!\*)\*([^\*\n]+?)\*(?!\*)', r'\\textit{\1}', text)
    
    # Inline code: `...` -> \texttt{...}
    text = re.sub(r'`([^`\n]+?)`', r'\\texttt{\1}', text)
    
    # Replace figures
    text = text.replace('figures/proving_time.png', 'figures/proving_time.pdf')
    text = text.replace('figures/gas_comparison.png', 'figures/gas_comparison.pdf')
    
    # Lists
    lines = text.split('\n')
    list_lines = []
    in_item_list = False
    in_enum_list = False
    for line in lines:
        m_item = re.match(r'^\*\s+(.*)$', line)
        m_enum = re.match(r'^\d+\.\s+(.*)$', line)
        if m_item:
            if not in_item_list:
                list_lines.append(r'\begin{itemize}')
                in_item_list = True
            list_lines.append(r'\item ' + m_item.group(1))
        elif m_enum:
            if not in_enum_list:
                list_lines.append(r'\begin{enumerate}')
                in_enum_list = True
            list_lines.append(r'\item ' + m_enum.group(1))
        else:
            if in_item_list:
                list_lines.append(r'\end{itemize}')
                in_item_list = False
            if in_enum_list:
                list_lines.append(r'\end{enumerate}')
                in_enum_list = False
            list_lines.append(line)
    if in_item_list:
        list_lines.append(r'\end{itemize}')
    if in_enum_list:
        list_lines.append(r'\end{enumerate}')
    text = '\n'.join(list_lines)

    # Sanitize prose (escape _ and &)
    text = sanitize_latex_prose(text)

    # Restore math blocks completely untouched
    text = restore_math(text, math_blocks)

    return text

def build():
    # Read abstract
    with open('paper/sections/00_abstract.md', 'r', encoding='utf-8') as f:
        ab_raw = f.read()
    ab_clean = ab_raw.replace('# Abstract\n\n', '').strip()
    ab_tex = convert_md_section(ab_clean)

    # Read and convert sections 01 to 08
    body_sections = []
    section_files = [
        '01_introduction.md',
        '02_background_and_related_work.md',
        '03_system_and_threat_model.md',
        '04_vericarbon_design.md',
        '05_implementation.md',
        '06_evaluation.md',
        '07_discussion_and_limitations.md',
        '08_conclusion.md',
    ]

    for sf in section_files:
        with open(os.path.join('paper', 'sections', sf), 'r', encoding='utf-8') as f:
            content = f.read()
        converted = convert_md_section(content)
        body_sections.append(converted)

    body_tex = '\n\n'.join(body_sections)

    # Read and convert appendices
    with open('paper/sections/09_appendices.md', 'r', encoding='utf-8') as f:
        app_content = f.read()
    app_tex = convert_md_section(app_content)

    manuscript = f"""\\documentclass[preprint,12pt]{{elsarticle}}

\\usepackage{{amsmath,amssymb,amsthm}}
\\usepackage{{graphicx}}
\\usepackage{{booktabs}}
\\usepackage{{hyperref}}
\\usepackage{{xcolor}}
\\usepackage{{url}}
\\usepackage{{tabularx}}
\\usepackage{{enumitem}}

\\hypersetup{{
    colorlinks=true,
    linkcolor=blue!70!black,
    citecolor=blue!70!black,
    urlcolor=blue!70!black
}}

\\journal{{Future Generation Computer Systems}}

\\newtheorem{{definition}}{{Definition}}
\\newtheorem{{lemma}}{{Lemma}}
\\newtheorem{{assumption}}{{Assumption}}

\\begin{{document}}

\\begin{{frontmatter}}

\\title{{VeriCarbon: Zero-Knowledge Verifiable Monitoring, Reporting, and Verification for Decentralized Carbon Registries}}

\\author{{Anonymous Authors}}

\\begin{{abstract}}
{ab_tex}
\\end{{abstract}}

\\begin{{keyword}}
Zero-Knowledge Proofs \\sep Verifiable Machine Learning \\sep Carbon Markets \\sep Digital MRV \\sep Blockchain Nullifiers \\sep Layer 2 Rollups
\\end{{keyword}}

\\end{{frontmatter}}

{body_tex}

\\appendix
{app_tex}

\\bibliographystyle{{elsarticle-num}}
\\bibliography{{refs}}

\\end{{document}}
"""
    with open('paper/manuscript.tex', 'w', encoding='utf-8') as f:
        f.write(manuscript)
    print("Successfully built paper/manuscript.tex!")

if __name__ == '__main__':
    build()
