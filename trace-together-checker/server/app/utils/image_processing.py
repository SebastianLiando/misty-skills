import os


def get_trace_together_image_path(image_id: str, file_name: str):
    """Returns the path to the TraceTogether image file."""
    path_from_this_folder = os.sep.join([
        os.pardir,  # app folder
        os.pardir,  # trace-together-checker folder
        'images',
        image_id,
        file_name
    ])

    return os.path.dirname(__file__) + f"{os.sep}{path_from_this_folder}"
