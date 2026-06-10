import ollama
resp = ollama.chat(model='gemma4:e4b', messages=[{'role':'user','content':'이 회사의 핵심 문제를 한 문장으로 요약해줘.'}], options={'temperature':0})
print('=== RAW ===')
print(repr(resp['message']['content']))
