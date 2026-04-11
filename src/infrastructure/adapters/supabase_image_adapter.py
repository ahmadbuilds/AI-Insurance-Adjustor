from supabase import Client
from domain.ports import ImageRepositoryPort, ImageStoragePort
from domain.entities import ImageRecord


class SupabaseImageAdapter(ImageRepositoryPort, ImageStoragePort):
    """
    Adapter for image-related database and storage operations.
    Implements ImageRepositoryPort and ImageStoragePort using Supabase.
    """

    def __init__(self, client: Client, bucket_name: str = "claim_images"):
        self._client = client
        self._bucket_name = bucket_name

    def fetch_claim_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch all images for a given claim_id from Supabase and return them as a list of ImageRecord.
        args:
            claim_id: UUID of the claim to fetch images for.
        returns:
            List of ImageRecord objects containing image metadata and storage path.
        """
        response = (
            self._client
            .table("claim_images")
            .select("id, claim_id, user_id, storage_path, file_name, file_size, mime_type, is_vehical")
            .eq("claim_id", claim_id)
            .execute()
        )
        if not response.data:
            return []

        return [ImageRecord(**row) for row in response.data]

    def update_vehicle_status(self, image_id: str, is_vehical: bool) -> bool:
        """
        Update the is_vehical column for a specific image in Supabase.
        args:
            image_id: UUID of the image to update.
            is_vehical: Boolean indicating whether a vehicle was detected in the image.
        returns:
            True if the update was successful, False otherwise.
        """
        response = (
            self._client
            .table("claim_images")
            .update({"is_vehical": is_vehical})
            .eq("id", image_id)
            .execute()
        )
        return bool(response.data)

    def get_public_url(self, storage_path: str) -> str:
        """
        Get the public URL for a given storage path in the Supabase bucket.
        args:
            storage_path: The path to the image file in the Supabase storage bucket.
        returns:
            A public URL string that can be used to access the image.
        """
        return self._client.storage.from_(self._bucket_name).get_public_url(storage_path)

    def fetch_vehicle_images(self, claim_id: str) -> list[ImageRecord]:
        """
        Fetch only images with is_vehical=True for a given claim_id from Supabase and return them as a list of ImageRecord.
        args:
            claim_id: UUID of the claim to fetch vehicle images for.
        returns:
            List of ImageRecord objects containing metadata for images that have is_vehical=True.
        """
        response = (
            self._client
            .table("claim_images")
            .select("id, claim_id, user_id, storage_path, file_name, file_size, mime_type, is_vehical")
            .eq("claim_id", claim_id)
            .eq("is_vehical", True)
            .execute()
        )
        if not response.data:
            return []

        return [ImageRecord(**row) for row in response.data]
