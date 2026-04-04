import os
from dotenv import load_dotenv


load_dotenv('.env.local')

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
supabase_service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')