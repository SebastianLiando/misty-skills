from app.app_utils.validator import is_location_valid

multi_line = """[ § SofcEntry Check-in

30 Mor, 10:34 AM

roOD PARADE © NTU
CANTEEN 2

 
"""
single_line = """§ So'cEntry Check-in

18 Mar, 2:47 PM

NTU « N2 AND N4 CLUSTER

 

a
"""


def test_single_line_location_valid():
    actual = is_location_valid(single_line, "NTU - N3 & N4 CLUSTER")
    assert actual[0]
    assert actual[1] == "NTU « N2 AND N4 CLUSTER"


def test_multi_line_location_invalid():
    actual = is_location_valid(multi_line, "FOOD PARADISE @ NTU CANTEEN 2")
    assert actual[0]
    assert actual[1] == "roOD PARADE © NTU CANTEEN 2"
