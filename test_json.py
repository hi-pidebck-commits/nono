import ollama
from pydantic import BaseModel

class Answer(BaseModel):
    summary: str
    confidence: float

resp = ollama.chat(model='gemma4:e4b', messages=[{'role':'user','content':'Connect AI라는 회사의 핵심 문제를 요약해줘.'}], format=Answer.model_json_schema(), options={'temperature':0})
data = Answer.model_validate_json(resp['message']['content'])
print('요약:', data.summary)
print('신뢰도:', data.confidence)
