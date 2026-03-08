import os
from dotenv import load_dotenv


load_dotenv('.env.local')

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')