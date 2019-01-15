$(window).on('load', function() {
    startTime();
    $('#_loader').fadeOut(2000, function() {
        document.getElementById('_body').hidden = false;
        document.getElementById('_loader').hidden = true;
        $('#_master').addClass('body-padding');
    });

    setTimeout(function() {
        $('.masthead').addClass('header-background');
    }, 1700);
});
