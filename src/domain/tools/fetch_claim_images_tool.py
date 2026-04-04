from langchain_core.tools import tool
from domain.ports import ImageRepositoryPort, ImageStoragePort


#wrapper function to fetch claim images using the ImageRepositoryPort and ImageStoragePort
def make_fetch_claim_images_tool(
    image_repository: ImageRepositoryPort,
    image_storage: ImageStoragePort,
    claim_id: str,
):
    @tool(
        "fetch_claim_images",
        description="Fetches all images for the current claim from the database and resolves their public URLs. No input is required.",
    )
    def fetch_claim_images() -> list[dict]:
        """
        Tool function to fetch all images associated with the current claim.
        Returns:
            list[dict]: List of image records enriched with public_url.
        """
        images = image_repository.fetch_claim_images(claim_id)

        result = []
        for img in images:
            public_url = image_storage.get_public_url(img.storage_path)
            result.append({
                "id": img.id,
                "claim_id": img.claim_id,
                "storage_path": img.storage_path,
                "file_name": img.file_name,
                "mime_type": img.mime_type,
                "public_url": public_url,
            })

        return result

    return fetch_claim_images
