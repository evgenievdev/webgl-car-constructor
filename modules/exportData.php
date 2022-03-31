<?php

  
    if( isset( $_REQUEST["data"] ) && isset( $_REQUEST["path"] ) && isset( $_REQUEST["filename"] ) ) {

        $data = $_REQUEST["data"];
        $path = $_REQUEST["path"];
        $filename = $_REQUEST["filename"];

        if (!file_exists( $path )) {
            mkdir( $path , 0777, true);
        }

        $file = fopen( $path.$filename , "w");
        fwrite($file, $data);
        fclose($file);

        echo "File saved : ".$path.$filename;

    }

?>