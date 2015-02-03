/**
 * Created by Kristjan on 9.10.2014.
 */
//Ilitialize fastclick to get (guess what) faster click
window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);
$(function() {
    function showSpinner() {
        $('#ajaxload').show();
    }
    function hideSpinner() {
        $('#ajaxload').hide();
    }

    $(document).ajaxStart(showSpinner).ajaxStop(hideSpinner);
});

$(document).ready(function(){
    /*
     Global variables
     */
    var main = $('.main');
    var server = $('#server').val();
    var base = $('#base').val();
    var clientcode = $('#clientcode').val();
    var numbtn = $('.numbtn');
    var goToLogout = 0;
    var refreshId = setInterval(function () {
        goToLogout=0;
    },5000);

    //Translations
    var g_messSent = "Teade on saadetud";
    var g_waiterComing = "Teenindaja saabub peatselt";
    var g_payCard='kaardimakse';
    var g_payCash='sularaha';




    /*
     Knockout vm
     */

    var Router = function Router(currentPAge) {
        this.Page = ko.observable(currentPAge);
        this.server = ko.observable();
        this.base = ko.observable();
        this.sessid = ko.observable();

        this.message = ko.observableArray();


        this.GoToLogin = function () {
            this.Page('Login');
        };
        this.GoToTable = function(){
            this.Page('Tables');
        };
        this.GoToProducts = function(){
            this.Page('Products');
        }
    };

    var Auth =function Auth(){
        this.pincode= ko.observable()
    };

    var TableItem = function TableItem(data){
        this.id=ko.observable(data.id);
        this.name=ko.observable(data.name);
    };
    var LangItem = function LangItem(data){
        this.tag = ko.observable(data.tag);
        this.name = ko.observable(data.name);
    };

    var Tables = function Vm() {
        this.tableItems  = ko.observableArray([]);
        this.columnCount = ko.observable(3);

        this.columns = ko.computed(function() {
            var columns     = [],
                itemCount   = this.tableItems().length,
                begin       = 0;
            while (begin + 1 < itemCount) {
                columns.push( this.tableItems.slice(begin, begin + this.columnCount()) );
                begin += this.columnCount();
            }
            return columns;

        }, this);
    };

    var Langs = function Langs(){
        this.langItems  = ko.observableArray([]);
        this.selLang = ko.observable();
        this.selLangTag = ko.observable();
        this.setLanguage = function(){
            vm.lang.selLang(this.name());
            vm.lang.selLangTag(this.tag());
        };
    };
    var Product = function Product(){
        this.catList = ko.observableArray([]);
        this.prodList = ko.observableArray([]);
        this.orderList = ko.observableArray([]);
        this.pendingOrder = ko.observableArray([]);
        this.waiter = ko.observable();
        this.waiterid=ko.observable();
        this.currency=ko.observable();

        this.selectedCategory = ko.observable();
        this.selectedCatname = ko.observable();

        this.orderNotes = ko.observable();

        this.selectCategory= function(category){
            var catpage =$('.catpage');
            $(catpage).hide(500);
            $('#sidemenu').hide(500);
            vm.prod.selectedCategory(category.catid);
            vm.prod.selectedCatname(category.catname);
            $(catpage).show(500);
        };
        this.addPendingOrder = function(product){
            vm.prod.pendingOrder.push(product);

        };
        this.removeItem = function () {
            vm.prod.pendingOrder.remove(this);
        };
        this.orderPrice = ko.computed(function(){
            var grandtotal = 0;
            ko.utils.arrayForEach(this.pendingOrder(), function (item) {
                grandtotal=grandtotal+parseFloat(item.price);
            });
            return grandtotal.toFixed(2);
        },this)

    };

    vm = {
        router: new Router(),
        login: new Auth(),
        tables: new Tables(),
        lang: new Langs(),
        prod: new Product()
    };

    ko.applyBindings(vm);
    vm.login.pincode('');
    vm.router.server(server);
    vm.router.base(base);

    /*
     Preflight check
     */
    $.getJSON(server+'/menu/app/status',{sessid: localStorage.getItem('sessid')}, function (data) {
        console.log(data);
        if(data.state != 'OK'){
            vm.router.message.push('Vabandust');
            vm.router.message.push('Serveriga ei ole võimalik suhelda');
            vm.router.message.push('Palun kontrolli internetiühendust');
            $('#message').modal('show');
        }else{
            vm.router.sessid(data.sessid);

            if(data.menuauth){
                if(data.sessid >0){
                    getOpenOrders();
                }
                if(data.tbl>0){
                    getProducts();
                }else{
                    getTables();
                }
            }else{
                vm.router.GoToLogin();
            }
        }
    });
    //Empty messages array on modal close
    $('#message').on('hidden.bs.modal', function () {
        vm.router.message.removeAll();
    });

    /*
     Login section
     */
    //nupp = document.getElementsByClassName("numbtn");
    var pinfield = $(main).find('.pinfiled');
    var flag = false;
    //Add pin code
    $(main).on('click','.numbtn',function(){
        //$(numbtn).bind('touchstart',function () {
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
    $(numbtn).bind('touchend', function () {
        $(this).css('background-color','rgba(255,255,255,0.9)');
    });

    //Clear button
    $(main).on('click','.clrbtn', function (){
        //$('.clrbtn').bind('touchstart', function () {
        var nr=vm.login.pincode();
        pinval = nr.substr(0,nr.length-1);
        vm.login.pincode(pinval);
    });


    //Submit pin code
    $(main).on('click','.entbtn',function(){
        //$('.entbtn').bind('touchstart', function () {
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
                    vm.router.sessid(data.sessid);
                    localStorage.setItem('sessid',data.sessid);
                    renderTables(data.tables);
                    renderLanguages(data);
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
                sessid: vm.router.sessid()
            },
            success: function(data){
                renderTables(data.tables);
                renderLanguages(data);
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
    function renderLanguages(data){
        vm.lang.selLang(data.deflang);
        vm.lang.selLangTag(data.deflangtag);
        $.each(data.langs, function (index, value) {
            vm.lang.langItems.push(new LangItem({
                tag: value.tag,
                name: value.name
            }))
        })
    }

    //Post table/lang info to server and get menu
    $(main).on('click','.chstable', function () {
        var langtag = vm.lang.selLangTag();
        var tableid = $(this).data('id');

        $.ajax({
            url: server+'/menu/app/products',
            type: "POST",
            data:{
                sessid: vm.router.sessid(),
                lang: langtag,
                table: tableid
            },
            success: function(data){
                if (data != '500') {
                    vm.prod.catList(data.catlist);
                    vm.prod.prodList(data.prodlist);
                    vm.prod.waiter(data.waiter);
                    vm.prod.waiterid(data.waiterid);
                    vm.prod.currency(data.currency);
                    vm.router.GoToProducts();
                }
            }
        })
    });


    /*
     END Tables section
     */

    /*
     Prodpage section
     */
    function getProducts(){
        $.ajax({
            url: server+'/menu/app/products',
            type: "POST",
            data:{
                sessid:vm.router.sessid()
            },
            success: function(data){
                if (data != '500') {
                    vm.prod.catList(data.catlist);
                    vm.prod.prodList(data.prodlist);
                    vm.prod.waiter(data.waiter);
                    vm.prod.waiterid(data.waiterid);
                    vm.prod.currency(data.currency);
                    vm.router.GoToProducts();
                }
            }
        })
    }
    $(main).on('click','.waitername', function () {
        goToLogout++;
        if(goToLogout>=2){
            $.getJSON(server+'/menu/app/logout',{sessid: vm.router.sessid()},function(data){
                if(data=="done"){
                    goToLogout=0;
                    vm.router.sessid(null);
                    vm.tables.tableItems.removeAll();
                    localStorage.removeItem('sessid');
                    vm.router.GoToLogin();
                }
            })
        }
    });
    //Close categories menu
    $(main).on('click','#closemenu', function () {
        $('#sidemenu').hide(300);
    });
    //Open categories menubar
    $(main).on('click','#startmenu', function () {
        $('#sidemenu').show(300);
    });
    //Open pending order view
    $(main).on('click','#orderopen', function () {
        $('#ordermenu').show(300);
    });
    //Close pending order view
    $(main).on('click','#closeorder', function () {
        $('#ordermenu').hide(300);
    });
    //Make a fly effect for product + button
    $(main).on('click','.orderbox', function () {
        $(this).closest('tr').effect("transfer",{ to: $("#prodcount") }, 500);
        $('#orderopen').effect('highlight');
    });
    //To confirm order
    $(main).on('click','#conforder', function () {
        if (vm.prod.pendingOrder().length>0) {
            $(this).effect('highlight');
            makeOrder();
        } else {
            $('#totalsum').effect('highlight',500);
        }
    });
    //Call waitress
    $(main).on('click','#callservice', function () {
        $('#callservice').css('color','#f4ff77');
        $(this).effect('highlight');
        send_message(1);
    });
    //Open invoice view
    $(main).on('click','#invopen', function () {
        getOpenOrders();
        $(this).effect('highlight');
        $('#sidemenu').hide(300);
        $('#ordermenu').hide(300);
        $('#invoice').show('blind');
    });
    //Close invoice view
    $(main).on('click','#closeinv', function () {
        $('#invoice').hide('blind');

    });

    function makeOrder(){
        var items = ko.mapping.toJS(vm.prod.pendingOrder());
        var list = [];
        var orderlist = [];
        //Extract product id's (thats all what we need)
        ko.utils.arrayForEach(vm.prod.pendingOrder(), function (item) {
            list.push(item.id);
        });

        //Make list unique (remove dublicate items
        var uniqlist = list.unique();

        //Loop over list with all id's and count them
        $.each(uniqlist,function(key,value){
            var pqty=countItems(list,value);
            orderlist.push({'id':value, 'qty':pqty});
        });
        var data={
            products: orderlist,
            notes: vm.prod.orderNotes(),
            sessid: vm.router.sessid()
        };
        alert(data);
        $.ajax({
            url: server+'/menu/app/saveorder',
            type: 'POST',
            data: data,
            success: function(data){
                alert(data);
                if(data=='200'){
                    $('#ordermenu').hide(300);
                    vm.prod.pendingOrder.removeAll();
                    vm.router.message.push('Täname');
                    vm.router.message.push('Teie tellimus on teenindajale edastatud.');
                    vm.router.message.push('Kui soovite tellida juurde siis valige toode ning kinnitage tellimus.');
                    $('#message').modal('show');
                    getOpenOrders();
                }
            }
        })
    }

    Array.prototype.unique = function() {
        var arr = [];
        for(var i = 0; i < this.length; i++) {
            if(!arr.contains(this[i])) {
                arr.push(this[i]);
            }
        }
        return arr;
    };
    Array.prototype.contains = function(v) {
        for(var i = 0; i < this.length; i++) {
            if(this[i] === v) return true;
        }
        return false;
    };
    function countItems(arr,item){
        var count=0;
        $.each(arr,function(key,value){
            if(value==item){count++}
        });
        return count;
    }

    function send_message(type, order) {
        $.ajax({
            url: server+'/menu/app/message',
            type: "POST",
            cache: false,
            data: {
                sessid: vm.router.sessid(),
                MessageType: type,
                Order: order,
                waiter: vm.prod.waiterid()
            },  // type hardcoded, replace with variable for multiple options
            success: function(){
                if(type==1){
                    vm.router.message.push(g_messSent);
                    vm.router.message.push(g_waiterComing);
                    $('#message').modal('show');
                }
                $('#callservice').css('color','#fff');
            }
        });
    }
    function getOpenOrders(){
        $.ajax({
            url: server+'/menu/app/orders',
            type: "POST",
            data:{
                sessid: vm.router.sessid()
            },
            success: function (data) {
                console.log(data);
                vm.prod.orderList(data);
            }
        })
    }

    $('#paycard').click(function(){
        $(this).effect('highlight');
        send_message(3);
        $('#paytype').text(g_payCard);
        $('#invoice').hide();
        $('#payresult').show();
    });
    $('#paycash').click(function(){
        $(this).effect('highlight');
        send_message(2);
        $('#paytype').text(g_payCash);
        $('#invoice').hide();
        $('#payresult').show();
    });

    /*
     END Prodpage section
     */



});