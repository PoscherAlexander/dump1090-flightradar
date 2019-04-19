<?php

class AirConnect
{
    public static function establish()
    {
        //Input Data for mySQL Connection to public server
        $servername = "localhost";
        $username = "database_username";    //username of the database user
        $password = "database_password";    //password of the database user
        $dbname = "database";   //database

        $conn = new mysqli($servername, $username, $password, $dbname);
        $conn->set_charset('UTF8');

        if ($conn->connect_error) {
            die("Error: Server is temporary not avaliable");
            return false;
        } else {
            return $conn;
        }
    }
}
?>
