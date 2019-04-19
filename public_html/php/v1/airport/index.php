<?php
include '../database/AirConnect.php';
header('Access-Control-Allow-Origin: *');  
header('Content-type: application/json');

if (isset($_GET['icao']) && !empty($_GET['icao'])) {
    $_GET['icao'] = strtoupper($_GET['icao']);
    $conn = AirConnect::establish();
    $sql = 'SELECT * FROM airports WHERE icao = "' . $_GET['icao'] . '"';
    $res = $conn->query($sql);
    if ($res->num_rows == 1) {
        $row = $res->fetch_assoc();
        echo json_encode($row, JSON_UNESCAPED_UNICODE);
    }
    $conn->close();
}
?>
