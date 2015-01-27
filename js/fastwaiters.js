/**
 * Created by Kristjan on 9.10.2014.
 */
//Ilitialize fastclick to get (guess what) faster click
window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);


$(document).ready(function(){
    /*
     Global variables
     */
    var main = $('.main');
    var server = $('#server').val();
    var clientcode = $('#clientcode').val();




    /*
     Knockout vm
     */

    var Router = function Router(currentPAge) {
        this.Page = ko.observable(currentPAge);

        this.GoToLogin = function () {
            this.Page('Login');
        };
        this.GoToTable = function(){
            this.Page('Tables');
        }
    };

    var Auth =function Auth(){
        this.pincode= ko.observable()
    };

    var TableItem = function TableItem(data){
        this.id=ko.observable(data.id);
        this.name=ko.observable(data.name);
    };

    var Tables = function Vm() {
        this.tableItems  = ko.observableArray([]);
        this.columnCount = ko.observable(3);

        this.columns = ko.computed(function() {
            var columns     = [],
                itemCount   = this.tableItems().length,
                begin       = 0;

            // we use begin + 1 to compare to length, because slice
            // uses zero-based index parameters
            while (begin + 1 < itemCount) {
                columns.push( this.tableItems.slice(begin, begin + this.columnCount()) );
                begin += this.columnCount();
            }

            return columns;

            // don't forget to set `this` inside the computed to our Vm
        }, this);
    };

    vm = {
        router: new Router(),
        login: new Auth(),
        tables: new Tables()
    };

    ko.applyBindings(vm);
    vm.login.pincode('');


    /*
     Preflight check
     */
    $.getJSON(server+'/menu/app/status', function (data) {
        console.log(data);
        if(data.menuauth){
            getTables();
        }else{
            vm.router.GoToLogin();
        }


    });

    /*
     Login section
     */
    //nupp = document.getElementsByClassName("numbtn");
    var pinfield = $(main).find('.pinfiled');
    var flag = false;
    //Add pin code
    $(main).on('click','.numbtn', function () {
        var pinfield = $(main).find('.pinform').find('.pinfiled');
        if (!flag) {
            $('.pinalert').slideUp(200);
            flag = true;
            setTimeout(function(){ flag = false; }, 100);
            $('.numbtn').css('background-color','rgba(255,255,255,0.9)');
            $(this).css('background-color','rgba(230,77,37,0.7)');
            var nr=String($(this).data('nr'));
            var old=String(vm.login.pincode());
            vm.login.pincode(old+nr);
        }
        return false
    });
    //Clear button
    $(main).on('click','.clrbtn', function () {
        var nr=vm.login.pincode();
        pinval = nr.substr(0,nr.length-1);
        vm.login.pincode(pinval);
    });
    //Submit pin code
    $(main).on('click','.entbtn', function () {
        var pin = $('#pinfield').val();
        $.ajax({
            url: server+"/menu/app/auth",
            type: "POST",
            data: {
                pincode: pin,
                client: clientcode,
                action: 'auth'
            },
            success: function(data){
                if(data=="fail"){
                    $('.pinalert').slideDown(200);
                    vm.pincode('');
                }else{
                    renderTables(data.tables);
                }
            }
        })

    });

    /*
     END Login section
     */

    /*
     Tables section
     */
    function getTables(){
        $.ajax({
            url: server+'/menu/app/tables',
            type: 'POST',
            data: {
                client: clientcode
            },
            success: function(data){
              renderTables(data);
            }
        })
    }
    function renderTables(data){
        $.each(data, function (index, value) {
            vm.tables.tableItems.push(new TableItem({
                id:value.id,
                name: value.name
            }))
        });
        //$('#tableList').text(ko.mapping.toJS(vm.tableList()));
        //$(main).html($('#tablesTmpl').html());
        vm.router.GoToTable();
    }


    /*
     END Tables section
     */



});