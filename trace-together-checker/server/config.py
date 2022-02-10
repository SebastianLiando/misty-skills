import json
import os

CONFIG_FILE_PATH = os.path.dirname(__file__) + "/config.json"


def _create_or_load_config(path=CONFIG_FILE_PATH) -> dict:
    """Returns the config object from the config file.
     If it doesn't exist, create a new one."""
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        # Write a config file
        config = {}
        with open(path, 'w+') as f:
            json.dump(config, f)

        return config


_CONFIG = _create_or_load_config(CONFIG_FILE_PATH)


def get_location_for_robot(serial: str) -> str:
    """Returns the TraceTogether check-in location for a robot."""
    return _CONFIG[serial]['location']
