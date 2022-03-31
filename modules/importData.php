<?php

    if( isset( $_GET["path"] ) && isset( $_GET["filename"] ) ) {

        $path = $_GET["path"];
        $filename = $_GET["filename"];

        if (!file_exists( $path )) {
            echo "no such path";
        }

        $data = file_get_contents( $path.$filename );

        echo $data;

    }

?>