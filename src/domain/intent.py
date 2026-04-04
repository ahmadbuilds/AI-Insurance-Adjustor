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
