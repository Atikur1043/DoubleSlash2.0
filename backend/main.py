import os
import string
import json
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from system_params import system_prompt_eval

app = FastAPI()
load_dotenv()

sample_qs = json.loads(open("D:\Visual Studio Code\Programs\DoubleSlash-Backend\sample_qs.json", "r").read())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this list as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SingleQuestionBlock(BaseModel):
    qid: int
    question: str
    teacher_answer: str
    student_answer: Optional[str] = None

class MultipleQuestionBlock(BaseModel):
    question_set: list[SingleQuestionBlock]

client = Groq(
    api_key=os.getenv("OPENAI_API_KEY"),
)
    
@app.post("/evaluate/")
def evaluate(questions_block: MultipleQuestionBlock):
    response = { "evaluation": []}
    
    for question in questions_block.question_set:
        to_eval = f"""
        Question {question.qid}: {question.question}
        Teacher's Answer: {question.teacher_answer}
        Student's Answer: {question.student_answer}
        """
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt_eval.strip(),
                },
                {
                    "role": "user",
                    "content": to_eval.strip(),
                }
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=256,
            response_format={"type": "json_object"},
            temperature=0.5
        )
        
        answer = chat_completion.choices[0].message.content
        response["evaluation"].append(json.loads(answer))

    return response