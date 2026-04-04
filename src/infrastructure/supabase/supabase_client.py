from supabase import create_client,Client

try:
    from src.config import supabase_key,supabase_url,supabase_service_role_key
except ModuleNotFoundError:
    from config import supabase_key,supabase_url,supabase_service_role_key

client:Client=create_client(supabase_url,supabase_key)

def get_user_from_token(token:str):
    """
    Given a Supabase auth token, return the associated user information.
    This can be used in tools that need to operate in the context of a specific user.
    Args:
        token (str): Supabase auth token
    Returns:
        dict: User information if token is valid, None otherwise
    """
    try:
        response=client.auth.get_user(token)
        return response.user
    except Exception as e:
        print(f"Error fetching user from token: {str(e)}")
        return None

def get_service_client()->Client:
    """
    Return a Supabase client authenticated with the service role key for elevated permissions.
    This client should be used for backend operations that require bypassing RLS, such as the
    classification agent's access to claim images.
    returns:
        Client: Supabase client authenticated with service role key
    """
    return create_client(supabase_url,supabase_service_role_key)
