<?php
include '../database/AirConnect.php';
header('Access-Control-Allow-Origin: *');  
header('Content-type: application/json');

$conn = AirConnect::establish();
$sql = 'SELECT * FROM airports';
$res = $conn->query($sql);
$json = array();
if ($res->num_rows > 0) {
    while($row = $res->fetch_assoc()) {
        $json[] = $row;
    }
    echo json_encode($json, JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>
