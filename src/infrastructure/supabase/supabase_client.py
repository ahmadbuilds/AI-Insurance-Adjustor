from supabase import create_client,Client

try:
    from src.config import supabase_key,supabase_url
except ModuleNotFoundError:
    from config import supabase_key,supabase_url

client:Client=create_client(supabase_url,supabase_key)

def get_user_from_token(token:str):
    try:
        response=client.auth.get_user(token)
        return response.user
    except Exception as e:
        print(f"Error fetching user from token: {str(e)}")
        return None