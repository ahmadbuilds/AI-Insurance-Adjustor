from langchain_groq import ChatGroq
from langchain.chat_models import BaseChatModel

#function to create a groq provider
def create_model_instance(model_name:str='llama-3.3-70b-versatile', temperature:float=0, max_retries:int=3)->BaseChatModel:
    model=ChatGroq(
        model=model_name,
        temperature=temperature,
        max_retries=max_retries,
    )
    return model