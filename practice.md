# かっこいい秘密組織のためのかっこいいプログラミング言語入門 Elm 編 実践

後半では，関数型言語でのアプリ作成を，ポーカーアプリの作成を通して学びます．

[よく使うリンク](../#よく使うリンク)のEllieで成果物を共有しながら進めて行きます．

## Ellieを触る

Ellieを開いてサンプルコードを確認しましょう．左側にコード(ELM, HTML)，右側に実行結果のボタンと数字が出ているはずです．

左のコードを弄って，COMPILEを押すと右側で動かす（もしくはコンパイルエラーが出る），というのを繰り返してアプリを作っていきましょう．

他の人の作ったパッケージのimportや，DEBUGの支援，外部から読み込んだ関数にカーソルを合せるとドキュメントへのリンクが出てくる便利機能もありますが，必要になったらで良いでしょう．

今は，右の「+1」「-1」のボタンをポチポチして，それらの間の数字が増減することを確かめ，左のコードがもうアプリとして動作するものだということに納得して先に進みます．

## サンプルコードのアウトライン

ここでは，このサンプル（カウンター）を元に，アプリを作るときのコードの全体像を説明します．

上から

- module
- import
- 型と関数（とports）

を並べます．

型と関数はreplでやったものと同じです．moduleも，1ファイルでプログラムが完結する場合は，このままコピペで問題ないので，しばらくはおまじないとしておきましょう．

## import

[外部モジュール関数の呼出し](../#外部モジュール関数の呼出し)で，「モジュール」という名前を分ける機構があることを学びました．`List.map`などはそのまま使えましたが，一般のモジュールはimportと書いてからでないと使えません．

例えば，
```elm
import Browser
```
と書いているので，最下部で`Browser.sandbox`と関数を使えているわけです．

このようにして外部モジュールをimportします．

### exposing

もう少しimportを見ていきましょう．

```elm
import Html exposing (Html, button, div, text)
```

`exposing`とありますね．後ろに型や関数名を指定すると，それらをモジュール名を省略して呼ぶことができるようになります．

例えば
```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```
の`div`は，本来`Html.div`だったのですが，exposingによって，このコード内で定義したかのように使えます．

:::[exposing乱用注意の話]
同じように，`view`関数の中で使われている`String.fromInt`も，`import String exposing (fromInt)`を加えてやれば，`fromInt`で使えるようになります．やってみましょう．

…やってもらうと分かると思うのですが，`fromInt`という名前だけだと「Intからなににする関数なんだ？」という混乱が生じます．短縮のための安易な`exposing`は避け，もう1つのimportの機能，`as`を使うか，`let itoa = String.fromInt`などとしましょう．

個人な使いどころとしては，型名は大体`exposing`します．例えば，`Html`モジュールで定義された`Html`型を`Html.Html`と書くのはダルいので，`import Html exposing (Html)`とします．なんだかんだでコードを分離するときは，中心となるデータ型があることが多いようで，モジュール名と型名は被りがちなのです．
:::

`exposing`にはそのモジュール内全部を指す，`(..)`という指定もあります．ただ，何がexposeされたのか把握しきれないので，個人的には使うのは`Html`くらいです（HTMLタグは種類多くて列挙が面倒なため）．

実は同じ関数名を含む複数のモジュールを`exposing (..)`することもできます．ただし，衝突している名前を使ったときはコンパイルエラーとなります．エラーメッセージには`exposing`の使い方に関する指南も入っています．

### as

より短く外部の関数名や型名を指定したい場合の他の選択肢として，`as`を使ったモジュールの別名があります．

例えば
```elm
import Html.Events exposing (onClick)
```
で，exposingを使わないとしたら，`Html.Events.onClick`という長い名前になります．

某魔法使いのおばあさんのように「贅沢な名だね．今からお前の名前は`E`だ．」という強い気持ちを持って，`Html.Events`に`E`という別名をつけるには以下のようにします．

```elm
import Html.Events as E
```

こうすると`E.onClick`で呼び出せます（別に名前を奪ってはいないので，`Html.Events.onClick`でも呼べます）．

別名は1文字でなくても良いですが，名前は大文字ではじめる必要があります．違反すると，例によって丁寧なエラーメッセージが表示され，どんな略称が使われているのかの例が見れます．やってみましょう．

`as`もまた既存の名称と衝突させることができ，例えば以下のように，せっかくevanzが分類したモジュールを混ぜる冒涜的行為も可能です．

```elm
import Html.Events as Html
```

## The Elm Archtecture（TEA）

`module`はコピペ，`import`も使える，型も関数も書けるので，文法的にはもうアプリを書けますが，まだどうアプリになるのかがピンとこないと思います．今までやってきたのは純粋な関数を定義する方法なので，アプリのような状態の管理と書き換えは守備範囲外です．

そこで出てくるのがこのWebフロントエンド用フレームワーク，TEA（ティー）です．

TEAは`Model`, `View`, `Update`という要素からなります．

- **Model**: アプリの状態を表す型
- **View**: 状態をHTMLに変換する関数
- **Update**: 状態を更新する関数

サンプルコードと共に見ていきましょう．（サンプルが荒れ果ててしまった人はEllieのページをリロードしてください．）

### Model

Modelはアプリの全状態を表す型です．

```elm
type alias Model =
    { count : Int }
```

サンプルでは，カウンターの数値だけが入ったレコード型です．カウンターアプリなので，現在のカウント中の数値だけが状態の全て，ということです．

Modelはレコード型である必要はありませんし，何なら`Model`という型名にしなくても動きます．ただ，役割が分かりやすいように`Model`と名付けておくとよいでしょう．雑多なデータを全部入れるので，それぞれに名前を付けられるレコード型も無難な選択です．

Modelは型だけでなく，初期値も必要になります．`Model`型の関数として用意します．

サンプルでは`initialModel`という（定数）関数がそれにあたります．

```elm
initialModel : Model
initialModel =
    { count = 0 }
```

### View

Viewは描画用の関数です．これは型が決まっていて，`model -> Html msg`です．現在の状態を引数にとって，描画用のHtmlを返す関数です．

2つの型変数，`model`と`msg`がありますが，アプリごとに型を決められるようにフレームワークでは型変数となっています．もちろん今回`model`は先ほどの`Model`を使います．

`msg`については**Update**と一緒に見た方が分かりやすいので，まず`view`関数で返す`Html`を見てみましょう．

```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```

返されるHTMLの構造はこうです．

```html
<div>
  <button onClick=...>+1</button>
  <div>0</div>
  <button onClick=...>-1</button>
</div>
```

対応は明快ですね．

APIも見てみましょう．`div`の後ろに`List`が2つあるので，`div : List ? -> List ? -> Html`のような関数だとあたりが付きます．

`div`にカーソル（マウスポインタでなくテキスト編集の方）を合せて出てくるリンクから，ドキュメントを参照してください．`div : List (Attribute msg) -> List (Html msg) -> Html msg`などと少し込み入った型が出てきます．

型変数`msg`がまた出てきましたが，一旦置いておいて，`Attribure`（属性）のリストと`Html`（子要素）のリストを引数に取るということです．

つまり，
```html
<div onclickとかここに書きたいもののリスト>
  buttonとか中に入れたい要素リスト
</div>
```
を
```
div <onclickとかここに書きたいもののリスト> <buttonとか中に入れたい要素のリスト>
```
の順番で書けばよい，というだけです．（とりさんはよく属性の空リストを書き忘れます）

このインターフェースはHtml全体で共通なので，HTMLに習熟している人であれば**View**は難しくないでしょう．習熟していない人も少しいじってみましょう．

### 演習 View

サンプルの`view`関数を編集し，次の動作を実現せよ．

1. -1 ボタンを2つにせよ．
2. -1 ボタンをカウンタの数だけ表示せよ．0以下の場合は表示しない．

早く終わって暇な人は，[String.repeat](https://package.elm-lang.org/packages/elm/core/latest/String#repeat)を使って，💩でカウントできるようにしてください．

:::answer[解答例]
1. 単純に2つ書けば2つになります．

```elm
view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Increment ] [ text "+1" ]
        , div [] [ text <| String.fromInt model.count ]
        , button [ onClick Decrement ] [ text "-1" ]
        , button [ onClick Decrement ] [ text "-1" ]
        ]
```

2. model.count要素ならべればmodel.countつになります．
```elm
view : Model -> Html Msg
view model =
    let
      plusButton = button [ onClick Increment ] [ text "+1" ]

      countDiv = div [] [ text <| String.fromInt model.count ]

      minusButtons =
        List.range 1 model.count
        |> List.map (\_ -> button [ onClick Decrement ] [ text "-1" ])
    in
      div [] (plusButton :: countDiv :: minusButtons)
```

`List.range 1 model.count |> List.map`の代わりに，[`List.repeat`](https://package.elm-lang.org/packages/elm/core/latest/List#repeat)を使うとより簡潔です．
:::

### Update

さて，最後は**Update**，状態の更新方法を定義する関数です．状態の更新が必要になったときにフレームワークが自動で呼び出します．

型は`msg -> model -> model`です．**View**で触れたように`model`はアプリごとに定義した`Model`です．`msg`はなにかというと，これまたアプリごとに定義した，状態の更新が必要になるタイミングで送られるメッセージです．通常`Msg`という名前で定義します．

サンプルの`Msg`の定義を見てみましょう．

```elm
type Msg
    = Increment
    | Decrement
```

カウンターにとって状態の更新は2種類，`Increment`と`Decrement`と定義されています．

これを受ける`update`関数は以下のように，`Msg`の内容でmodel.countを増減させます．

```elm
update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            { model | count = model.count + 1 }

        Decrement ->
            { model | count = model.count - 1 }
```

また，型変数の`msg`は`update`と`view`で同じものを指定する必要があります．ボタンのHtmlの生成部分が分かりやすいでしょう．

```elm
button [ onClick Increment ] [ text "+1" ]
```

`onClick : msg -> Attribute msg`を`Increment : Msg`に適用すると`onClick Increment : Attribute Msg`となります．全体としてボタンは`button [ onClick Increment ] [ text "+1" ] : Html Msg`となり，`Increment`または`Decrement`のメッセージを送る可能性のある`Html Msg`という型になります．

### Model-View-Update

TEAのフレームワーク側から動作を見ると概ね以下のようになります．

- アプリの状態を表す`Model`という型の変数を保持する
  - 初回は`init`関数から取得する
- 状態に変更があるたび`view`に渡して描画を更新する
- イベントがあれば`Msg`として`update`に渡して状態を更新する

このようにして，関数を用意するだけで実際に動作するアプリを作ることができるのです．

最後にmain関数を見てみましょう．全体のコードはこの1つの関数を定義するためにあります．

```elm
main : Program () Model Msg
main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }
```

`Browser.sandbox`を，初期状態を与える`init`と，描画用の`view`，更新用の`update`からなるレコードに適用しています．

全体の型は`Program () Model Msg`とあるように，3つの型引数を伴う`Program`型です．（`()`の部分はJava Script側から初期値を与えるときに使います）

`Browser.sandbox`の型は
```
sandbox :
    { init : model
    , view : model -> Html msg
    , update : msg -> model -> model
    }
    -> Program () model msg
```
となっており，この型によって`model`や`msg`が関数間で一貫することが求められます．

`Program`を作る関数は他にもあります．

- **sandbox**: 今回紹介した最小構成
- **element**: ページ全体でなく1要素として埋め込む用
- **document**: タイトルを変えられる
- **application**: URLを変えられる

このアプリ作成では基本的に`sandbox`を使う予定ですが，乱数の都合で`element`も利用するかもしれません．

## ポーカーアプリの仕様

今回作るのは一人用のファイブカード・ドローです．

カードを5枚引き，任意の枚数捨てて引き直し，役ができるかどうか，というものです．

役によって得点を付けて連続でゲームできるようにする，ダブルアップできるようにする，など拡張は考えられますが，まずは役を判定するところまでを目指します．

## まずは表示しよう

アプリを作るときは`view`から作るのがおススメです．
見えて動くとデバッグがしやすいですし，モチベになりますからね．

理由からわかるように，`view`を作りきるのではなく，表示できるようになったら`update`に最も基本的な機能を追加し，徐々に動く範囲を増やしていきます．

### カードの定義

まずは表示するカードを定義しましょう．

カスタム型で以下のようにします．

```elm
type Card = Card Suit Rank
```

以下のようにタプルを使っても良いですが，今回はとりあえずカスタム型にしました．

```elm
type alias Card = ( Suit, Rank )
```

スートは，前半で[カスタム型を学んだときの定義](../#列挙するカスタム型)があるのでそれを使います．

Rank型は作っても構わないですが，とりあえずIntとしておきます．

**Cardの定義**
```elm
type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString : Suit -> String
suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int
```

### はじめのview

まずは手札が表示できると良いので，`List Card`を表示できるように…
といいたい所ですがここは刻みます．

まずは`type alias Model = Card`として，1枚表示します．HTMLもtext要素だけでいいでしょう．

文字列にするには`suitToString`と`String.fromInt`が使えますね．

```elm
view : Model -> Html Msg
view (Card suit rank) =
      text <| suitToString suit ++ String.fromInt rank
```

ちょっとオシャレに書きました．

`(Card suit rank)`はパターンが1つの場合の分解は引数の位置で行えるのを使います．

左向きのパイプはHtmlの属性等でよく使われます．
今回はtextですが，「右辺の結果」のtextという演出です．

### 虚無のupdate

`main`には`update`が必要なので，以下のように何もしない`update`を作ります．

```elm
type Msg
    = None

update : Msg -> Model -> Model
update msg model =
    model
```

`Msg`は未定なので`None`という値のみ，`update`は常に元のモデルを返す更新しないものをとします．

### Modelの初期値

`main`には`init`が必要なので，以下のように好きなカード1枚を初期値にします．

```elm
initialModel : Model
initialModel = Card Spade 1
```

後はmoduleとimport，`main`をサンプルと同じように定義すれば，コンパイルは通るはずです．

:::details[完成品]

先頭に`main`を置いていますが，Model-View-Updateがどの関数と対応しているのか，プログラムの概要を忘れた際に便利だからです（普段はimportなどと共に読み飛ばします）．

また，役割ごとに関数をまとめておくとコードが増えたときに便利です．
解説し忘れましたが，`--`でコメントが書けます（行中に書くと移行がコメント）．

```elm
module Main exposing (main)

import Browser
import Html exposing (Html, text)



main =
    Browser.sandbox
        { init = initialModel
        , view = view
        , update = update
        }



-----------
-- MODEL --
-----------

type alias Model = Card

type Card = Card Suit Rank

type Suit
    = Spade
    | Heart
    | Diamond
    | Club

suitToString suit =
    case suit of
        Spade -> "♠"
        Heart -> "♥"
        Diamond -> "♦"
        Club -> "♣"

type alias Rank = Int

initialModel : Model
initialModel = Card Spade 1



------------
-- UPDATE --
------------

type Msg
    = None

update : Msg -> Model -> Model
update msg model =
    model



----------
-- VIEW --
----------

view : Model -> Html Msg
view (Card suit rank) =
      text <| suitToString suit ++ String.fromInt rank
```
:::

### 5枚表示

ここまで表示できるようになったら，表示枚数を5枚に変更します．

以下の手順でやって見ましょう．

1. 今までの1枚表示の`view`関数は再利用できるので`cardView : Card -> Html Msg`に改名
2. `Model`を`{ hands : List Card }`に変更
3. `{ hands : List Card }`が入力される想定で新しく`view : Model -> Html Msg`を作成
4. とりさんの開発を再現し，やり切った顔でCOMPILEを押してエラーを出す
5. エラーを直す

:::spoiler[3で詰まったときのヒント]
5枚も処理するのは大変と思うかもしれませんが，1枚処理する関数は既にあります．
そして嬉しいことに型は`List`です．

処理後の型が`List`で，1つのHtmlになっていませんが，Htmlの各要素は子要素を持てます．
:::

## 機能追加

これで出発点ができました，ここから手分けして機能を実装する多人数開発ができるくらいに良い出発点です．

- 手札の見た目を改善
- 山札からカードを引く機能
- 手札のカードを捨てるためのUIの作成
- 手札に役が成立しているか判定
