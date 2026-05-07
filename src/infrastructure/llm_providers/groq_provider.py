import os
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel

#function to create a groq provider
def create_model_instance(model_name:str='llama-3.3-70b-versatile', temperature:float=0, max_retries:int=3, **kwargs)->BaseChatModel:
    api_key = os.getenv("GROQ_API_KEY")
    print(f"[Groq] Creating model '{model_name}' (api_key_set={bool(api_key)}, max_retries={max_retries})")
    model=ChatGroq(
        model=model_name,
        temperature=temperature,
        max_retries=max_retries,
        **kwargs,
    )
    return model
