from supabase import create_client,Client

try:
    from src.config import supabase_key,supabase_url,supabase_service_role_key
except ModuleNotFoundError:
    from config import supabase_key,supabase_url,supabase_service_role_key

_client: Client = None
_service_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL or Key is missing")
        _client = create_client(supabase_url, supabase_key)
    return _client

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
        client = get_client()
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
    global _service_client
    if _service_client is None:
        if not supabase_url or not supabase_service_role_key:
            raise ValueError("Supabase URL or Service Role Key is missing")
        _service_client = create_client(supabase_url, supabase_service_role_key)
    return _service_client
