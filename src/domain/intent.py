from typing import Literal


# Classification agent status lifecycle
ClassificationStatus = Literal[
    "pending",
    "fetching_images",
    "analyzing",
    "updating",
    "completed",
    "failed"
]

# Same vehicle detection agent status lifecycle
SameVehicleStatus = Literal[
    "pending",
    "fetching_vehicle_images",
    "analyzing",
    "completed",
    "failed"
]
