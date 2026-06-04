import ollama, time
from pydantic import BaseModel, ValidationError

class Answer(BaseModel):
    summary: str
    confidence: float

def ask(prompt, retries=3):
    last = None
    for i in range(retries):
        try:
            resp = ollama.chat(model='gemma4:e4b', messages=[{'role':'user','content':prompt}], format=Answer.model_json_schema(), options={'temperature':0, 'num_ctx':4096, 'num_predict':1024})
            return Answer.model_validate_json(resp['message']['content'])
        except (ValidationError, Exception) as e:
            last = e
            print(f'[재시도 {i+1}] 실패:', e)
            time.sleep(2 ** i)
    raise RuntimeError(f'최종 실패: {last}')

if __name__ == '__main__':
    result = ask('Connect AI라는 회사의 핵심 문제를 요약해줘.')
    print('요약:', result.summary)
    print('신뢰도:', result.confidence)
