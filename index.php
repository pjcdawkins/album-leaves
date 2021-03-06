<?php

if ($_SERVER['REQUEST_URI'] !== '/') {
    http_response_code(404);
    exit;
}

$settings = ["sounds" => []];
$sounds_dir = 'sounds';
$sound_files = scandir($sounds_dir);
if (!empty($sound_files)) {
    foreach ($sound_files as $key => $sound_file) {
        if ($sound_file[0] === '.') {
            continue;
        }
        $id = 's' . md5($sound_file);
        $filename = preg_replace('/^[0-9]+ ?\- ?/', '', pathinfo($sound_file, PATHINFO_FILENAME));
        $url = '/' . $sounds_dir . '/' . rawurlencode($sound_file);
        $settings["sounds"][] = [
            'id' => $id,
            'name' => $filename,
            'url' => $url,
            'column' => $sound_file[0],
        ];
    }
}

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Album Leaves</title>

    <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
    <link href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">
    <link href="/css/styles.css" rel="stylesheet">

    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->

    <script type="text/javascript">
        var settings = <?php echo json_encode($settings); ?>;
    </script>
</head>
<body>
<h1>Album Leaves</h1>

<section class="container-fluid">
    <div class="controls">
        <button class="play-pause"><i class="fa fa-play"></i> Play</button>
        <button class="rewind" title="Rewind"><i class="fa fa-fast-backward"></i></button>
        <button class="fast-forward" title="Fast forward"><i class="fa fa-fast-forward"></i></button>
    </div>

    <div class="players row col-sm-8 col-sm-offset-2">
        <div class="player col-xs-6">
            <h2>Quartet</h2>
        </div>
        <div class="player col-xs-6">
            <h2>Trumpet</h2>
        </div>
    </div>
</section>

<footer>
    <div class="col-md-10 col-md-offset-1">
        <p>Under construction</p>
    </div>
</footer>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>
<script src="/node_modules/soundmanager2/script/soundmanager2-jsmin.js"></script>
<script src="/js/main.js"></script>
</body>
</html>
