(function($) {
  
  "use strict";  

  $(window).on('load', function() {

     /* Page Loader active
    ========================================================*/
    setTimeout(() => {
      $('#preloader').fadeOut();
    }, 500);



    $('.howto').slick({          
      slidesToShow: 4,
      responsive: [
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 3
          }
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1
          }
        }
      ]
});

    if ($('.team-img').length) {
        var list = document.getElementsByClassName('team-img');
        for (var i = 0; i < list.length; i++) {
            var src = list[i].getAttribute('data-image-src');
            list[i].style.backgroundImage = "url('" + src + "')";
        }
        $(".team-img").click(function(e) {
            var a = $(this).attr("data-image-src");
            $("#img01").attr("src", a);
        });
       
    }

     if ($('.level-img').length) {
        var list = document.getElementsByClassName('level-img');
        for (var i = 0; i < list.length; i++) {
            var src = list[i].getAttribute('data-image-src');
            list[i].style.backgroundImage = "url('" + src + "')";
        }
        $(".level-img").click(function(e) {
            var a = $(this).attr("data-image-src");
            $("#img-level-img").attr("src", a);
        });
       
    }


function getSelectedValue(id) {
  return $("#" + id).find("dt a span.value").html();
}
$("button").click(function(e){
  var val = getSelectedValue('countries');  
});

$(".dropdown dt a").click(function(e) {
  $(".dropdown dd ul").toggle();
  e.preventDefault();
});

$(".dropdown dd ul li a").click(function() {
  var text = $(this).html();
  $(".dropdown dt a span").html(text);
  $(".dropdown dd ul").hide();
  
}); 

$(document).bind('click', function(e) {
    var $clicked = $(e.target);
    if (! $clicked.parents().hasClass("dropdown"))
        $(".dropdown dd ul").hide();
});

  

  // Sticky Nav
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 200) {
            //$('.scrolling-navbar').addClass('top-nav-collapse');
            $('.scrolling-navbar').addClass('remove_header');
        } else {
            //$('.scrolling-navbar').removeClass('top-nav-collapse');
            $('.scrolling-navbar').removeClass('remove_header');
        }
    });

    /* slicknav mobile menu active  */
    // $('.mobile-menu').slicknav({
    //   prependTo: '.navbar-header',
    //   parentTag: 'liner',
    //   allowParentLinks: true,
    //   duplicate: true,
    //   label: '',
    //   closedSymbol: '<i class="icon-arrow-right"></i>',
    //   openedSymbol: '<i class="icon-arrow-down"></i>',
    // });

    /* ==========================================================================
    countdown timer
    ========================================================================== */
    //  jQuery('#clock').countdown('2020/10/19',function(event){
    //   var $this=jQuery(this).html(event.strftime(''
    //   +'<div class="time-entry hours"><span>%H</span></div> '
    //   +'<div class="time-entry minutes"><span>%M</span></div>'
    //   +'<div class="time-entry seconds"><span>%S</span></div>'));
    // });


    /* WOW Scroll Spy
    ========================================================*/
    //  var wow = new WOW({
    //   //disabled for mobile
    //     mobile: false
    // });
    // wow.init();

    // one page navigation 
    // $('.onepage-nev').onePageNav({
    //   currentClass: 'active'
    // });

    /* Back Top Link active
    ========================================================*/
      var offset = 200;
      var duration = 500;
      $(window).scroll(function() {
        if ($(this).scrollTop() > offset) {
          $('.back-to-top').fadeIn(400);
        } else {
          $('.back-to-top').fadeOut(400);
        }
      });

      $('.back-to-top').on('click',function(event) {
        event.preventDefault();
        $('html, body').animate({
          scrollTop: 0
        }, 600);
        return false;
      });

  });      

}(jQuery));