from langchain_core.tools import tool
from domain.ports import ImageRepositoryPort


#wrapper function to update vehicle status using the ImageRepositoryPort
def make_update_vehicle_status_tool(image_repository: ImageRepositoryPort):
    @tool(
        "update_vehicle_status",
        description="Updates the is_vehical column in the claim_images table for a specific image. Pass the image_id and whether a vehicle was detected (true/false).",
    )
    def update_vehicle_status(image_id: str, is_vehical: bool) -> str:
        """
        Tool function to update the vehicle detection result for a claim image.
        Args:
            image_id: UUID of the image record in claim_images table.
            is_vehical: True if a vehicle was detected, False otherwise.
        Returns:
            str: Success or failure message.
        """
        success = image_repository.update_vehicle_status(image_id, is_vehical)
        if success:
            return f"Successfully updated image {image_id}: is_vehical={is_vehical}"
        return f"Failed to update image {image_id}"

    return update_vehicle_status
